import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const sqsClient = new SQSClient({ region });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
};

const handler = async (event) => {
  console.log("Received event:", event);
  const { eid, hostId, hostName, uid, name, email, eventName, invitationStatus } = event;

  if (
    !eid ||
    !hostId ||
    !hostName ||
    !uid ||
    !name ||
    !email ||
    !eventName ||
    !invitationStatus
  ) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Invalid input data." }),
    };
  }

  try {
    // Fetch host user's email
    const hostParams = {
      TableName: "Eventful-Users",
      Key: {
        id: hostId,
      },
    };

    const hostData = await ddbDocClient.send(new GetCommand(hostParams));
    const hostEmail = hostData.Item.email;

    // Send a message to the SQS queue
    const sqsMessageBody = {
      eventName,
      eventId: eid,
      senderName: name,
      senderId: uid,
      recipientEmail: hostEmail,
      recipientName: hostName,
      invitationStatus,
      timestamp: new Date().toISOString(),
    };

    console.log("SQS message body:", sqsMessageBody);

    const sqsParams = {
      QueueUrl: "https://sqs.us-east-1.amazonaws.com/612277434742/Eventful-Invitations",
      MessageBody: JSON.stringify(sqsMessageBody),
      MessageAttributes: {
        RecipientEmail: {
          DataType: "String",
          StringValue: hostEmail,
        },
      },
    };

    const sqsResult = await sqsClient.send(new SendMessageCommand(sqsParams));
    if (!sqsResult) {
      throw new Error("Error sending invitation.");
    }

    console.log("SQS result:", sqsResult);

    // Update Eventful-Invitations table
    const updateParams = {
      TableName: "Eventful-Invitations",
      Key: {
        eid: eid,
        email: email,
      },
      UpdateExpression: "SET invitationStatus = :invitationStatus",
      ExpressionAttributeValues: {
        ":invitationStatus": invitationStatus,
      },
    };

    await ddbDocClient.send(new UpdateCommand(updateParams));

    const response = {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Invitation status updated successfully." }),
    };

    return response;
  } catch (error) {
    console.error("Error updating invitation status:", error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error updating invitation status." }),
    };
  }
};

export { handler };
