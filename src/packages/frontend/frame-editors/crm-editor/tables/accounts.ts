import { register } from "./tables";

register({
  name: "accounts",

  title: "Accounts",

  query: {
    crm_accounts: [
      {
        account_id: null,
        first_name: null,
        last_name: null,
        email_address: null,
        last_active: null,
        created: null,
      },
    ],
  },
});