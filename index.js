const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174","https://simple-task-manager-app.netlify.app"],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.netgysa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const db = client.db("taskManagerAppDB");
    const usersCollection = db.collection("users");
    const taskCollection = db.collection("tasks");

    // For localstorage
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(400).send({ message: "Invalid token" });
        }
        req.decoded = decoded;
        next();
      });

      // next();
    };
    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });
    // Logout
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
        console.log("Logout successful");
      } catch (err) {
        res.status(500).send(err);
      }
    });

    // post user data in db
    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      const result = await usersCollection.insertOne(userInfo);
      res.send(result);
    });
    // get all users by email
    app.get("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // get all user
    app.get("/users", verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // post user data in db
    app.post("/addTask", async (req, res) => {
      const taskInfo = req.body;
      const result = await taskCollection.insertOne(taskInfo);
      res.send(result);
    });

    // patch the user role
    app.patch("/users/role/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { role } = req.body; // Get the new role from the request body
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: role,
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // delete user from db
    app.delete("/delete/user/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // get tasks in taskCollection
    app.get("/tasks/:email", verifyToken, async (req, res) => {
        const email = req.params.email;
        const query = { "taskCreator.email": email };
      const result = await taskCollection.find(query).toArray();
      res.send(result);
    });
        // delete one task by id (taskcreator)
        app.delete(
            "/tasks/:id",
            verifyToken,
            async (req, res) => {
              const id = req.params.id;
              const query = { _id: new ObjectId(id) };
    
              // Delete the task from the taskCollection
              const result = await taskCollection.deleteOne(query);
      
              res.send(result);
            }
          );
              // get tasks in taskCollection(user)
    app.get("/task", verifyToken, async (req, res) => {
      const result = await taskCollection.find().toArray();
      res.send(result);
    });
        // delete one task by id (taskcreator)
        app.delete(
            "/tasks/:id",
            verifyToken,
            async (req, res) => {
              const id = req.params.id;
              const query = { _id: new ObjectId(id) };
    
              // Delete the task from the taskCollection
              const result = await taskCollection.deleteOne(query);
      
              res.send(result);
            }
          );

              // update task data
    app.put(
        "/tasks/:id",
        verifyToken,
        async (req, res) => {
          const id = req.params.id;
          const {status} = req.body;
          const filter = { _id: new ObjectId(id) };
          const updateDoc = {
            $set: {
                status:status
            },
          };
          const result = await taskCollection.updateOne(filter, updateDoc);
          res.send(result);
        }
      );

      







    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from Task Manager App  Server..");
});

app.listen(port, () => {
  console.log(`Task Manager App is running on port ${port}`);
});
