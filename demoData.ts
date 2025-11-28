
export const DEMO_DATA = {
  "account": {
    "settings": {
      "title": "Settings",
      "changeEmail": "Change email",
      "confirmEmailDescription": "You will receive an email to confirm your account.",
      "enterYourNewEmailAddress": "Enter your new email address",
      "noAttachedPwd": "There is no password connected to your account.<1/>To set a password please click on Reset password link below.",
      "emailChanged": "Your email address has been changed successfully",
      "emailNotChanged": "Email has not been changed",
      "notAbleToChangeEmail": "We were not able to change your email as the specified email address is already being used.",
      "tabs": {
        "company": "Company",
        "account": "Account",
        "billing": "Billing",
        "personal": "Personal",
        "profile": "Profile",
        "businessProfile": "Business profile",
        "team": "Team",
        "notifications": "Notifications",
        "security": "Security",
        "planAndLimits": "Plan and limits",
        "cashback": "Cashback",
        "integrations": "Integrations and Perks",
        "products": "Products & Services"
      }
    },
    "team": {
      "title": "Team",
      "description": "Add users to your company to share, edit, and collaborate on invoices together.",
      "addUserButton": "Add user",
      "inviteBlock": {
        "text": "Invite team members to Finom to collaborate on transactions and invoices, receive a payment card and manage their expenses.",
        "button": "Invite new team member"
      },
      "role": {
        "Custom": "Custom",
        "AccountHolder": "Owner",
        "SuperVisor": "Manager",
        "Accountant": "Accountant",
        "Assistant": "Assistant",
        "Employee": "Employee"
      }
    },
    "invoicingOptions": {
      "title": "Invoicing options",
      "revenueStamp": {
        "checkbox": "Revenue stamp",
        "info": "Revenue stamp (Marca da bollo) is a VAT substitute tax that is applied to receipts and invoices in specific cases when the total amount exceeds <1>77,47 €</1>. Turn it on to indicate the amount and get the ability to apply it on your invoices.",
        "amount": "Revenue stamp amount (€)"
      },
      "taxWithHolding": {
        "apply": "Apply Tax Withholding",
        "checkbox": "Tax withholding",
        "info": "Tax withholding is a percentage of the taxable amount that’s paid by your customer to Revenue agency in your advance. Turn it on to set the preferences and get the ability to apply it on your invoices."
      }
    },
    "notifications": {
      "title": "Email notifications",
      "newsAndPromotions": {
        "checkboxTitle": "I'd like to receive news and promotions",
        "checkboxText": "Toggle it on to get messages about our latest features and product improvements as well as special offers and promo discounts notifications. Don’t worry we don’t send them too often."
      },
      "mobilepush": {
        "transactions": {
          "incomingPaymentText": "Received from {{companyName}}. Current balance {{balance}}.",
          "outgoingPaymentText": "Sent to {{companyName}}. Current balance {{balance}}.",
          "declinedPaymentTitle": "Payment declined",
          "declinedPaymentText": "Your payment for {{amount}} to {{companyName}} was declined. Tap this message for more details."
        }
      }
    }
  },
  "invoice": {
    "common": {
      "client": "Client",
      "number": "Number",
      "total": "Total",
      "dueDate": "Due date",
      "actions": "Actions",
      "overdue": "Overdue",
      "invoiceNotFound": "Invoice not found",
      "_to": "to",
      "itemName": "Item name",
      "shareInvoice": "Share your invoice with your customer to get paid"
    },
    "create": {
      "title": "New Invoice",
      "preview": "Preview",
      "address": "Address",
      "to": "Send to:",
      "newCustomer": "New customer",
      "goodsItems": "Items",
      "goodsQuantity": "Quantity",
      "goodsUnit": "Unit",
      "goodsPrice": "Price (net)"
    },
    "list": {
      "title": "Invoices",
      "totalUnpaid": "Unpaid",
      "_overdue": "overdue",
      "paid": "Paid",
      "draft": "Draft",
      "noInvoicesYet": "No invoices yet"
    },
    "validators": {
      "goods": {
        "title": "Items data incorrect",
        "mess": "Please check your items"
      },
      "number": {
        "title": "Invoice number already exists",
        "numberBusy": {
          "_1": "You already have an invoice with number {{number}}.",
          "_2": "Please change the invoice number."
        }
      }
    }
  },
  "banking": {
    "transactions": {
      "balance": "Balance",
      "allAccounts": "All accounts",
      "totalBalance": "Total balance in",
      "empty": "You dont have any transactions",
      "declinesReasons": {
        "InsufficientFunds": "Insufficient funds",
        "WalletBlocked": "Your wallet was blocked at the payment execution date"
      }
    },
    "cards": {
      "statusLabel": {
        "active": "Active",
        "frozen": "Frozen",
        "blocked": "Closed"
      },
      "title": {
        "cards": "Cards",
        "myCards": "My cards",
        "cardLimits": "Card limits"
      },
      "text": {
        "weShippedCard": "We've sent your card. Don't forget to activate the card when you receive it.",
        "cardActivation": "Enter the <strong>9-digit ID number</strong><br />written on the back of your card"
      }
    }
  },
  "common": {
    "btn": {
      "save": "Save",
      "cancel": "Cancel",
      "confirm": "Confirm",
      "delete": "Delete",
      "edit": "Edit",
      "continue": "Continue",
      "back": "Back"
    },
    "validators": {
      "emailRequired": "Email is required.",
      "passwordRequired": "Password required.",
      "emailIncorrect": "Email is incorrect."
    }
  }
};
