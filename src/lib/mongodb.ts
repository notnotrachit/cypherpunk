import { MongoClient } from "mongodb";

// It is highly recommended to store the MongoDB URI in an environment variable.
// For example, create a .env.local file with:
// MONGODB_URI="mongodb+srv://cypherpunk:cypherpunk@cypherpunk.lbmyvbh.mongodb.net/?appName=cypherpunk"
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "MongoDB URI not found. Please add it to your environment variables.",
  );
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // Allow global `var` declarations
  var _mongoClientPromise: Promise<MongoClient>;
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
