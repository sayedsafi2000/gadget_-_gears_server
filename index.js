const express = require("express");
const cors = require('cors');
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
//middleware
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
    res.send("Gadget-&-gears-running")
});

//mongo db atlas


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ldps5dz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try{
        const serviceCollection = client.db("gadgetAndgears").collection("services");
        const productsCollection = client.db("gadgetAndgears").collection("products");
        const usersCollection = client.db("gadgetAndgears").collection("users");
        const bookingCollection = client.db("gadgetAndgears").collection("booking");


        app.get("/jwt",async(req,res)=>{
            const email = req.query.email;
            const query = {email: email}
            const user = await usersCollection.findOne(query);
            if(user && user.email){
                const token = jwt.sign({email},process.env.ACCESS_TOKEN,{expiresIn:"7d"})
                return res.send({accessToken: token})
            }
            console.log(user)
            res.status(403).send({accessToken: ""})
        })

        app.get("/category", async (req, res) => {
            const query = {}
            const result = await serviceCollection.find(query).toArray();
            res.send(result)
        });
        app.get("/service/:category", async (req, res) => {
            const category = req.params.category;
            const query = ({category})
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
            let query = {category};
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
        app.post("/booking", async (req, res) => {
            const user = req.body;
            const result = await bookingCollection.insertOne(user);
            res.send(result);
        });
        app.get("/booking",async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const booking = await bookingCollection.find(query).toArray();
            res.send(booking)
        })

    }
    finally{

    }
}
run().catch(console.log)


app.listen(port, () => console.log(`Gadget-&-gears-running port ${port}`));