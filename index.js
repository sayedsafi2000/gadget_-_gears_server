const express = require("express");
const cors = require('cors');
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
//middleware
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
    res.send("Gadget-&-gears-running")
});

//mongo db atlas


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ldps5dz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send("Unauthorised access")
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "forbidden access" })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        const serviceCollection = client.db("gadgetAndgears").collection("services");
        const productsCollection = client.db("gadgetAndgears").collection("products");
        const usersCollection = client.db("gadgetAndgears").collection("users");
        const bookingCollection = client.db("gadgetAndgears").collection("booking");


        app.get("/jwt", async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user && user.email) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "7d" })
                return res.send({ accessToken: token })
            }
            console.log(user)
            res.status(403).send({ accessToken: "" })
        })

        app.get("/category", async (req, res) => {
            const query = {}
            const result = await serviceCollection.find(query).toArray();
            res.send(result)
        });
        app.get("/service/:category", async (req, res) => {
            const category = req.params.category;
            const query = ({ category })
            const result = await serviceCollection.find(query).toArray();
            res.send(result)
        });
        app.post("/category/allCategories", async (req, res) => {
            const query = req.body;
            const result = await productsCollection.insertOne(query);
            res.send(result)
        });
        app.get("/category/:category", async (req, res) => {
            const category = req.params.category
            let query = { category };
            // if (req.params.category) {
            //     query = {
            //         category: req.query.category
            //     }
            // }
            const cursor = productsCollection.find(query);
            const product = await cursor.toArray();
            res.send(product);
        });
        app.post("/users", async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        app.get("/users", async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });
        app.get("/users/admin/:email",async(req,res)=>{
            const email = req.params.email;
            const query= {email};
            const user = await usersCollection.findOne(query);
            res.send({isAdmin: user?.role === "admin"});
        })
        app.put("/users/admin/:id",verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = {email: decodedEmail};
            const user = await usersCollection.findOne(query);
            if(user.role !== "admin"){
                res.status(403).send({message: "forbidden access"})
            }
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    role: "admin"
                }
                
            }
            const result = await usersCollection.updateOne(filter,updatedDoc,options)
        })
        app.post("/booking", async (req, res) => {
            const user = req.body;
            const result = await bookingCollection.insertOne(user);
            res.send(result);
        });
        app.get("/booking", verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: "forbidden access" })
            }
            const query = { email: email };
            const booking = await bookingCollection.find(query).toArray();
            res.send(booking)
        })

    }
    finally {

    }
}
run().catch(console.log)


app.listen(port, () => console.log(`Gadget-&-gears-running port ${port}`));