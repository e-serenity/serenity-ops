'use strict';

var AWS = require('aws-sdk');
AWS.config.update({ apiVersion: '2012-08-10' });

var dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.DYNAMODB_BOUNCE_TABLE_NAME;
const serenityHubTable = process.env.SERENITY_OPS_TABLE_NAME;

exports.handler = (event) => {
  event.Records.forEach((record) => {
    let message;

    try {
      const snsMessage = JSON.parse(record.body);
      if (snsMessage.Type === "Notification" && snsMessage.Message) {
        message = JSON.parse(snsMessage.Message);
      } else {
        message = JSON.parse(record.body);
      }
    } catch (error) {
      console.log("Error parsing message body:", error);
      return;
    }

    if (!message.eventType) {
      return;
    }

    switch (message.eventType) {
      case "Bounce":
        handleBounce(message);
        break;
      case "Complaint":
        handleComplaint(message);
        break;
      case "DeliveryDelay":
        handleDeliveryDelay(message);
        break;
      case "Delivery":
        handleDelivery(message);
        break;
      default:
        console.log("Unhandled notification type: " + message.eventType);
    }
  });
};

function handleBounce(message) {
  const addresses = message.bounce.bouncedRecipients.map((recipient) => recipient.emailAddress);
  addresses.forEach((address) => writeDDB(address, message, tableName, "disable"));
}

function handleComplaint(message) {
  const addresses = message.complaint.complainedRecipients.map((recipient) => recipient.emailAddress);
  addresses.forEach((address) => writeDDB(address, message, tableName, "disable"));
}

function handleDeliveryDelay(message) {
  const addresses = message.deliveryDelay.delayedRecipients.map((recipient) => recipient.emailAddress);
  addresses.forEach((address) => writeDDB(address, message, tableName, "disable"));
}

function handleDelivery(message) {
  const addresses = message.delivery.recipients;
  addresses.forEach((address) => writeDDB(address, message, tableName, "enable"));
}

function writeDDB(id, payload, targetTable, status) {
  const LOCAL_TTL_SECONDS = 60 * 60 * 24 * 30;
  const domain = payload.mail.source.split('@')[1];
  const diagCode =
    payload?.bounce?.bouncedRecipients?.[0]?.diagnosticCode ||
    payload?.deliveryDelay?.delayedRecipients?.[0]?.diagnosticCode ||
    "";

  dynamodb.put({
    TableName: targetTable,
    Item: {
      UserId: id,
      eventType: payload.eventType,
      from: payload.mail.source,
      domain: domain,
      subject: payload?.mail?.commonHeaders?.subject,
      Type: payload?.bounce?.bounceType || payload?.deliveryDelay?.delayType,
      SubType: payload?.bounce?.bounceSubType,
      Diag: diagCode,
      reason: payload?.bounce?.reason,
      messageId: payload.mail.messageId,
      date: payload.mail.timestamp,
      state: status,
      ttl: Math.floor(Date.now() / 1000) + LOCAL_TTL_SECONDS
    }
  }, function(err) {
    if (err) {
      console.log(`Error writing to SES sending reports table: ${JSON.stringify(err)}`);
    }
  });

  if (serenityHubTable && serenityHubTable.trim() !== "") {
    const isoDate = payload.mail.timestamp || new Date().toISOString();
    const eventType = payload?.bounce?.bounceType || payload.eventType || "Bounce";
    const subType = payload?.bounce?.bounceSubType || payload?.deliveryDelay?.delayType || "General";
    const HUB_TTL_SECONDS = 60 * 60 * 24 * 90;

    dynamodb.put({
      TableName: serenityHubTable,
      Item: {
        PK: "MOD#serenity-ses",
        SK: `EVENT#${isoDate}#${payload.mail.messageId}`,
        id: payload.mail.messageId,
        timestamp: isoDate,
        type: eventType,
        subType: subType,
        recipient: id,
        domain: domain,
        smtp_code: diagCode,
        diagnosticCode: diagCode,
        actionStatus: "PENDING",
        ttl: Math.floor(Date.now() / 1000) + HUB_TTL_SECONDS
      }
    }, function(hubErr) {
      if (hubErr) {
        console.log(`Error writing to Serenity-Ops Hub table: ${JSON.stringify(hubErr)}`);
      }
    });
  }
}
