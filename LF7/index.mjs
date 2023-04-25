import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
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
  const { eid, email } = event;

  if (!eid || !email) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Invalid input data." }),
    };
  }

  const item = {
    eid,
    email,
    invitationStatus: "PENDING",
  };

  try {
    const dbResult = await ddbDocClient.send(
      new PutCommand({
        TableName: "Eventful-Invitations",
        Item: item,
      })
    );
    if (!dbResult) {
      throw new Error("Error creating invitation.");
    }

    // get event name
    const eventParams = {
      TableName: "Eventful-Events",
      Key: {
        id: eid,
      },
    };

    const eventData = await ddbDocClient.send(new GetCommand(eventParams));

    if (!eventData.Item) {
      throw new Error("Error creating invitation.");
    }

    const eventName = eventData.Item.name;
    const hostId = eventData.Item.uid;

    // get host user name
    const userParams = {
      TableName: "Eventful-Users",
      Key: {
        id: hostId,
      },
    };

    const userData = await ddbDocClient.send(new GetCommand(userParams));

    if (!userData.Item) {
      throw new Error("Error creating invitation.");
    }

    const hostName = userData.Item.name;

    const sqsMessageBody = {
      eventName,
      eventId: eid,
      hostName,
      hostId,
      recipientEmail: email,
    };

    console.log("SQS message body:", sqsMessageBody);

    // Send a message to the SQS queue
    const sqsParams = {
      QueueUrl: "https://sqs.us-east-1.amazonaws.com/612277434742/Eventful-Invitations",
      MessageBody: JSON.stringify(sqsMessageBody),
      MessageAttributes: {
        RecipientEmail: {
          DataType: "String",
          StringValue: email,
        },
      },
    };

    const sqsResult = await sqsClient.send(new SendMessageCommand(sqsParams));
    if (!sqsResult) {
      throw new Error("Error sending invitation.");
    }

    console.log("SQS result:", sqsResult);

    const response = {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Invitation created successfully." }),
    };

    return response;
  } catch (error) {
    console.error("Error creating invitation:", error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error creating invitation." }),
    };
  }
};

export { handler };

// flow
// The user selects friends to invite and sends the invitations from the frontend.
// The frontend calls the "Send Invitation" API (API Gateway + Send Invitation Lambda) with the necessary information.
// The Lambda function creates entries in the Invitation Table and sends notifications to the recipients via the SQS Invitation Queue.
// The recipients' clients poll the SQS Invitation Queue for new invitations.
// The recipient responds to the invitation (accepts or declines) from the frontend.
// The frontend calls the "Update Invitation" API (API Gateway + Update Invitation Lambda) with the updated status.
// The Lambda function updates the Invitation Table and, if accepted, updates the Event Table with the new attendee.

// exampleMessage = {
//   eventName: "Leo's Test Event 4",
//   eventId: '66b922b7-eba3-426c-9b54-e7858116a380',
//   hostName: 'Leo Zhang',
//   hostId: 'd2435856-adb6-4ccf-a0b0-63e242c34850',
//   recipientId: 'd2435856-adb6-4ccf-a0b0-63e242c34850',
//   recipientName: 'Leo Zhang',
//   recipientEmail: 'leozhvng@gmail.com'
// };
// Message Attribute: RecipientId
