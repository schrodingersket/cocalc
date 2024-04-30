import { BaseType } from "antd/es/typography/Base";

import { useTypedRedux } from "@cocalc/frontend/app-framework";
import { HelpIcon, Paragraph, Text } from "@cocalc/frontend/components";
import {
  LanguageModel,
  getLLMCost,
  isFreeModel,
} from "@cocalc/util/db-schema/llm-utils";
import { round2down, round2up } from "@cocalc/util/misc";

/*
NOTE: To get a quick idea about the numbers of how many completion tokens are returned, run this:

```sql
WITH data AS (
  SELECT model, (total_tokens - prompt_tokens) AS val
  FROM openai_chatgpt_log
  WHERE  time >= NOW() - '1 week'::interval
    AND tag like 'app:%'
)
SELECT model, PERCENTILE_CONT(0.5) WITHIN GROUP(ORDER BY val) AS median
FROM data
GROUP BY model
ORDER BY median desc
```

This gives a range from about 100 to almost 700.
The maximum (just use the "MAX" function, easier than the median) is at almost the token limit (i.e. 2000).

That's the basis for the number 100 and 1000 below!
*/


export const ESTIMATION_HELP_TEXT = (<><Paragraph>
  The cost of calling a large language model is based on the number of
  tokens. A token can be thought of as a piece of a word. For example,
  the word "cat" is one token, while "unbelievable" breaks down into
  three tokens: "un", "believe", "able".
</Paragraph>
<Paragraph>
  The total cost of your interaction depends on the number of tokens in
  your message and the LLM's reply. Please note that the exact cost is
  variable for each query. We're unable to predict the precise charge
  for each interaction, as it depends on the specific number tokens.
</Paragraph></>)

export function LLMCostEstimation({
  model,
  tokens, // Note: use the "await imported" numTokensUpperBound function to get the number of tokens
  type,
}: {
  model: LanguageModel;
  tokens: number;
  type?: BaseType;
}) {
  const isCoCalcCom = useTypedRedux("customize", "is_cocalc_com");
  const llm_markup = useTypedRedux("customize", "llm_markup");

  if (isFreeModel(model, isCoCalcCom)) {
    return (
      <Text style={{ textAlign: "right" }}>This model is free to use.</Text>
    );
  }

  const { min, max } = calcMinMaxEstimation(tokens, model, llm_markup);

  const minTxt = round2down(min).toFixed(2);
  const maxTxt = round2up(max).toFixed(2);
  return (
    <Text style={{ textAlign: "right" }} type={type}>
      Estimated cost: ${minTxt} to ${maxTxt}{" "}
      <HelpIcon title="LLM Cost Estimation">
        {ESTIMATION_HELP_TEXT}
        <Paragraph>
          The estimated price range is based on an estimate for the number of
          input tokens and typical amounts of output tokens. In rare situations,
          the total cost could be slightly higher.
        </Paragraph>
      </HelpIcon>
    </Text>
  );
}

export function calcMinMaxEstimation(
  tokens: number,
  model,
  llm_markup,
): { min: number; max: number } {
  const { prompt_tokens, completion_tokens } = getLLMCost(model, llm_markup);
  // NOTE: see explanation about for lower/upper number.
  // It could go up to the model's output token limit (i.e. even 2000)
  const min = tokens * prompt_tokens + 100 * completion_tokens;
  const max = tokens * prompt_tokens + 1000 * completion_tokens;

  return { min, max };
}
