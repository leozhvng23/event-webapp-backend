import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const handler = async (event) => {
  console.log(event);
  const { id } = event.pathParameters;
  const eventType = event.queryStringParameters.eventType;
  const page = parseInt(event.queryStringParameters.page) || 1;
  const limit = parseInt(event.queryStringParameters.limit) || 10;

  const user = await get_user_by_id(id);
  const email = user.email;

  let events;
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
  };

  try {
    if (eventType === "ALL") {
      events = await fetch_all_events(id, email, page, limit);
    } else if (eventType === "HOSTING") {
      events = await fetch_hosting_events(id, page, limit);
    } else if (eventType === "INVITED") {
      events = await fetch_invited_events(email, page, limit);
    } else {
      throw new Error("Invalid event type");
    }

    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify(events),
    };

    return response;
  } catch (error) {
    console.error("Error fetching events:", error);

    const response = {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Error fetching events." }),
    };

    return response;
  }
};

// const getStartKey = async (
//   tableName,
//   indexName,
//   keyConditionExpression,
//   expressionAttributeValues,
//   page,
//   limit
// ) => {
//   const params = {
//     TableName: tableName,
//     IndexName: indexName,
//     KeyConditionExpression: keyConditionExpression,
//     ExpressionAttributeValues: expressionAttributeValues,
//     ScanIndexForward: false,
//     Limit: (page - 1) * limit,
//   };

//   try {
//     const data = await ddbDocClient.send(new QueryCommand(params));
//     return data.LastEvaluatedKey;
//   } catch (error) {
//     console.error("Error getting start key:", error);
//     return null;
//   }
// };

const fetch_hosting_events = async (uid, page, limit) => {
  let startKey = null;
  let items = [];
  let currentPage = 1;

  while (currentPage <= page) {
    const params = {
      TableName: "Eventful-Events",
      IndexName: "uid-createdAt-index",
      KeyConditionExpression: "uid = :uid",
      ExpressionAttributeValues: {
        ":uid": uid,
      },
      ScanIndexForward: false,
      Limit: limit,
    };

    if (startKey) {
      params.ExclusiveStartKey = startKey;
    }

    const data = await ddbDocClient.send(new QueryCommand(params));
    startKey = data.LastEvaluatedKey;

    if (currentPage === page) {
      items = data.Items;
    }

    currentPage += 1;
  }

  return items;
};

const fetch_invited_events = async (email, page, limit) => {
  let startKey = null;
  let eventIds = [];
  let currentPage = 1;

  while (currentPage <= page) {
    const params = {
      TableName: "Eventful-Invitations",
      IndexName: "email-index",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
      ProjectionExpression: "eid",
      Limit: limit,
    };

    if (startKey) {
      params.ExclusiveStartKey = startKey;
    }

    const data = await ddbDocClient.send(new QueryCommand(params));
    startKey = data.LastEvaluatedKey;

    if (currentPage === page) {
      eventIds = data.Items.map((item) => item.eid);
    }

    currentPage += 1;
  }

  const events = await Promise.all(eventIds.map((eventId) => get_event_by_id(eventId)));
  return events;
};

const fetch_all_events = async (uid, email, page, limit) => {
  let hostingEvents = await fetch_hosting_events(uid, 1, page * limit);
  let invitedEvents = await fetch_invited_events(email, 1, page * limit);
  let allEvents = mergeEvents(hostingEvents, invitedEvents);
  return allEvents.slice((page - 1) * limit, page * limit);
};

const mergeEvents = (events1, events2) => {
  const eventMap = new Map();

  const addEvent = (event) => {
    if (!eventMap.has(event.id)) {
      eventMap.set(event.id, event);
    }
  };

  events1.forEach(addEvent);
  events2.forEach(addEvent);

  const merged = Array.from(eventMap.values());
  return merged.sort((a, b) => b.createdAt - a.createdAt); // sort in descending order of `createdAt`
};

const get_event_by_id = async (id) => {
  const params = {
    TableName: "Eventful-Events",
    Key: {
      id,
    },
  };

  const { Item } = await ddbDocClient.send(new GetCommand(params));
  return Item;
};

const get_user_by_id = async (id) => {
  const params = {
    TableName: "Eventful-Users",
    Key: {
      id,
    },
  };

  const { Item } = await ddbDocClient.send(new GetCommand(params));
  return Item;
};

export { handler };
