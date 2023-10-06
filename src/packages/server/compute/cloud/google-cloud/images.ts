/*
Working with Google Cloud images.

The Google cloud api from https://www.npmjs.com/package/@google-cloud/compute for images
is in theory documented at:

- https://cloud.google.com/compute/docs/reference/rest/v1/images
- https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-compute/src/v1/images_client.ts

The only way to actually use it is really study the docs *and* the
autogenerated typescript definitions.

Do not bother with any LLM's, at least as of Sept 2023, as they all (Bard, GPT-4, etc.)
are incredibly wildly wrong about everything about @google-cloud/compute.  Hopefully
this will change someday, since it would be nice, and all the information to correctly
train those models is available on github.  But oh my god what a nightmare.

In any case, typescript for the win here.
*/

import { getCredentials } from "./client";
import { ImagesClient } from "@google-cloud/compute";
import TTLCache from "@isaacs/ttlcache";
import dayjs from "dayjs";
import type {
  GoogleCloudConfiguration,
  ImageName,
} from "@cocalc/util/db-schema/compute-servers";
import { cmp } from "@cocalc/util/misc";
import { getGoogleCloudPrefix } from "./index";

export type Architecture = "x86_64" | "arm64";

// Return the latest available image of the given type on the configured cluster.
// Returns null if no images of the given type are available.

export async function imageName({
  image,
  date,
  tag,
  arch = "x86_64",
}: {
  image: ImageName;
  date?: Date;
  tag?: string;
  arch?: Architecture;
}) {
  const image1 = image.replace(".", "-").replace("_", "-");
  const gcloud_prefix = await getGoogleCloudPrefix();
  const prefix = `${gcloud_prefix}-${image1}-${
    arch == "x86_64" ? "x86" : arch
  }`; // _ not allowed
  if (!date) {
    return prefix;
  }

  // this format matches with what we use internally on cocalc.com for
  // docker images in Kubernetes:
  const dateFormatted = dayjs(date).format("YYYY-MM-DD-HHmmss");
  return `${prefix}-${dateFormatted}${tag ? "-" + tag : ""}`;
}

let client: ImagesClient | undefined = undefined;
let projectId: string | undefined;
export async function getImagesClient() {
  if (client != null && projectId != null) {
    return { client, projectId };
  }
  const credentials = await getCredentials();
  client = new ImagesClient(credentials);
  projectId = credentials.projectId as string;
  return { client, projectId };
}

// filters are documented at https://cloud.google.com/sdk/gcloud/reference/topic/filters/
// and "The matching is anchored and case insensitive. An optional trailing * does a
// word prefix match."

const imageCache = new TTLCache({ ttl: 60 * 1000 });

type ImageList = {
  name: string;
  labels: object;
  diskSizeGb: string;
  creationTimestamp: string;
}[];
export async function getAllImages({
  image,
  arch,
  sourceImage,
  labels,
}: {
  image?: ImageName;
  arch?: Architecture;
  sourceImage?: string;
  labels?: object;
}): Promise<ImageList> {
  let prefix;
  if (image == null) {
    // gets all images
    prefix = `${await getGoogleCloudPrefix()}-`;
  } else {
    // restrict images by image and arch
    prefix = await imageName({ image, arch });
    if (sourceImage) {
      prefix = `${prefix}-${sourceImage}`;
    }
  }
  const cacheKey = JSON.stringify({ image, arch, labels });
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }
  const { client, projectId } = await getImagesClient();
  let filter = `name:${prefix}*`;
  if (labels != null) {
    for (const key in labels) {
      filter += ` AND labels.${key}=${labels[key]} `;
    }
  }
  const [images] = await client.list({
    project: projectId,
    maxResults: 1000,
    filter,
  });
  imageCache.set(cacheKey, images as ImageList);
  return images as ImageList;
}

export function getArchitecture(machineType: string): Architecture {
  return machineType.startsWith("t2a-") ? "arm64" : "x86_64";
}

type ImageFilter = Partial<GoogleCloudConfiguration> & {
  prod?: boolean;
  arch?: Architecture;
};

export async function getNewestSourceImage(opts: ImageFilter): Promise<{
  sourceImage: string;
  diskSizeGb: number;
}> {
  const images = await getSourceImages(opts);
  if (images.length == 0) {
    throw Error(
      `no images are available for ${opts.image} ${opts.arch} compute servers that are labeled prod=true`,
    );
  }
  return images[0];
}

export async function getSourceImages({
  image,
  machineType,
  sourceImage,
  prod = true,
  arch,
}: ImageFilter = {}): Promise<
  {
    sourceImage: string;
    diskSizeGb: number;
  }[]
> {
  if (arch == null) {
    arch = machineType ? getArchitecture(machineType) : undefined;
  }
  const images = await getAllImages({
    image,
    arch,
    sourceImage,
    labels: !prod || sourceImage ? undefined : { prod: true },
  });
  // sort by newest first; note that creationTimestamp is an iso date string
  images.sort((a, b) => -cmp(a.creationTimestamp, b.creationTimestamp));
  const { projectId } = await getCredentials();
  return images.map(({ name, diskSizeGb }) => {
    return {
      sourceImage: `projects/${projectId}/global/images/${name}`,
      diskSizeGb: parseInt(diskSizeGb),
    };
  });
}

export async function labelSourceImages({
  filter,
  key = "prod",
  value = true,
}: {
  filter: ImageFilter;
  key;
  value;
}) {
  for (const { sourceImage: name } of await getSourceImages(filter)) {
    await setImageLabel({ name, key, value });
  }
}

// name = exact full name of the image
export async function setImageLabel({
  name,
  key,
  value,
}: {
  name: string;
  key: string;
  value: string | null | undefined;
}) {
  // console.log("setImageLabel", { name, key, value });
  const { client, projectId } = await getImagesClient();
  const i = name.lastIndexOf("/");
  if (i != -1) {
    name = name.slice(i + 1);
  }
  const [image] = await client.get({
    project: projectId,
    image: name,
  });
  let labels, labelFingerprint;
  ({ labels, labelFingerprint } = image);
  if (labels == null) {
    labels = {};
  }
  if (value == null) {
    if (labels[key] == null) {
      // nothing to do
      return;
    }
    delete labels[key];
  } else {
    labels[key] = `${value}`;
  }

  await client.setLabels({
    project: projectId,
    resource: name,
    globalSetLabelsRequestResource: {
      labels,
      labelFingerprint,
    },
  });
}
