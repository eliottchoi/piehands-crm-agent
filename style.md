# Sheet Headers & Style Guide

This document provides the official header rows for each sheet used in the Piehands CRM system. To ensure the script functions correctly, please copy and paste these headers into the first row of the corresponding sheet.

---

### 📖 Campaigns

Manages all email campaigns. `Notes` and `Last_Processed_At` are new columns used by the automation logic to provide feedback and ensure stability. The `Daily_Limit` column has been removed as the system now handles warmup automatically based on SendGrid's official recommendations.

```
Campaign_ID	Campaign_Name	Sender_Email	Target_Tag	Template_Name	Status	Progress	Notes	Last_Processed_At	Created_At
```

---

### 📝 Templates

Contains the email templates. The `Sender_Email` column has been removed to avoid confusion; the sender is now managed exclusively in the `Campaigns` sheet.

```
Template_Name	Subject	Body
```

---

### 👥 Target Audience

The master list of all potential email recipients.

**Dynamic Variables:** Any column header in this sheet can be used as a dynamic variable in your templates. For example, if you add a column named `favorite_food`, you can use `{{favorite_food}}` in your template, and it will be replaced with the value from that column for each recipient.

```
Creator_ID	Handle	Name	Email	Tag	Email_Status
```

---

### ⚙️ Settings

Contains system-wide settings. Do not change the `Setting_Name` values.

```
Setting_Name	Value
```

---

### ▶️ Queue

This sheet is automatically managed by the script. Do not edit manually.

```
Queue_ID	Campaign_ID	Creator_ID	Recipient_Email	Sender_Email	Final_Subject	Final_Body	Status	Retry_Count	Log_Details
```
---

### 📜 Logs

This sheet is automatically managed by the script. Do not edit manually.

```
Timestamp	Campaign_ID	Creator_ID	Action	Result	Details
```

---

### 🚫 Do Not Contact

Contains a list of users who have unsubscribed.

```
Email	Reason	Unsubscribed_At
```

---

### 📈 Engagement Logs

This sheet is automatically managed by the script via the SendGrid Event Webhook. It logs real-time user interactions like opens and clicks.

```
Timestamp	Campaign_ID	Recipient_Email	Event	URL_Clicked
```
