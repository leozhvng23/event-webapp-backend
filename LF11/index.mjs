import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
};

const handler = async (event) => {
  console.log("Received event:", event);
  const { id: eid } = event.pathParameters;

  if (!eid) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Invalid input data." }),
    };
  }

  try {
    const queryInvitationsParams = {
      TableName: "Eventful-Invitations",
      KeyConditionExpression: "eid = :eid",
      ExpressionAttributeValues: {
        ":eid": eid,
      },
    };

    const invitationsData = await ddbDocClient.send(
      new QueryCommand(queryInvitationsParams)
    );

    if (!invitationsData.Items) {
      throw new Error("Error fetching invitations.");
    }

    const userEmails = invitationsData.Items.map((invitation) => invitation.email);
    const usersByEmail = {};

    for (const email of userEmails) {
      const queryUserParams = {
        TableName: "Eventful-Users",
        IndexName: "email-index",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": email,
        },
        ProjectionExpression: "#id, #name, email",
        ExpressionAttributeNames: {
          "#id": "id",
          "#name": "name",
        },
      };

      const userData = await ddbDocClient.send(new QueryCommand(queryUserParams));

      if (userData.Items && userData.Items.length > 0) {
        usersByEmail[email] = userData.Items[0];
      }
    }

    const invitationList = invitationsData.Items.map((invitation) => {
      const userEmail = invitation.email;
      const user = usersByEmail[userEmail];

      return {
        uid: user ? user.id : null,
        name: user ? user.name : "",
        email: userEmail,
        invitationStatus: invitation.invitationStatus,
      };
    });

    const response = {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(invitationList),
    };

    return response;
  } catch (error) {
    console.error("Error fetching invitation data:", error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error fetching invitation data." }),
    };
  }
};

export { handler };
