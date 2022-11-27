const express = require("express");
const cors = require('cors');
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require('jsonwebtoken');
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
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

// jwt function 
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
        // all collection of mongodb 
        const serviceCollection = client.db("gadgetAndgears").collection("services");
        const productsCollection = client.db("gadgetAndgears").collection("products");
        const usersCollection = client.db("gadgetAndgears").collection("users");
        const bookingCollection = client.db("gadgetAndgears").collection("booking");
        const reportsCollection = client.db("gadgetAndgears").collection("reports");
        const paymentsCollection = client.db("gadgetAndgears").collection("payments");

        // jwt token api 
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
        // get all category from collection 
        app.get("/category", async (req, res) => {
            const query = {}
            const result = await serviceCollection.find(query).toArray();
            res.send(result)
        });
        // get all products by category from collection 
        app.get("/products", async (req, res) => {
            const categoryName = req.query.category;
            const query = { category: categoryName };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });
        app.get("/categories/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const categories = await serviceCollection.findOne(query);
            res.send(categories);
        });

        //klhjfoshojskld//dkslfhklsdjfk//

        app.get("/service/:category", async (req, res) => {
            const category = req.params.category;
            const query = ({ category })
            const result = await serviceCollection.find(query).toArray();
            res.send(result)
        });
        // category posted by seller from client site 
        app.post("/category/allCategories", async (req, res) => {
            const query = req.body;
            const result = await productsCollection.insertOne(query);
            res.send(result)
        });
        app.post("/report", async (req, res) => {
            const query = req.body;
            const result = await reportsCollection.insertOne(query);
            res.send(result)
        });
        // get product by matching category 
        app.get("/category/:category", async (req, res) => {
            const category = req.params.category
            let query = { category };
            const cursor = productsCollection.find(query);
            const product = await cursor.toArray();
            res.send(product);
        });

        app.get("/advertise-products", async (req, res) => {
            const query = { advertisement: true }
            const advertiseProducts = await productsCollection.find(query).toArray()
            res.send(advertiseProducts)
        })

        app.patch("/products/advertise/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const updateInfo = {
                $set: {
                    advertisement: true
                }
            }
            const updated = await productsCollection.updateOne(query, updateInfo)
            res.send(updated)
        })


        app.get("/seller/product/:email", async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            console.log(query)
            const cursor = productsCollection.find(query);
            const product = await cursor.toArray();
            res.send(product);
        });
        // create user by login google and save on user collections 
        app.put("/users/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email };
            options = { upsert: true };
            const updatedDoc = {
                $set: {
                    name: user.name,
                    email: user.email,
                    userType: user.userType,
                }
            };
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });
        // create user by login firebase authentications and save on user collections 
        app.post("/users", async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        // get all user from user collections 
        app.get("/users", async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });
        // make a api for admin role user 
        app.get("/users/admin/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === "admin" });
        });
        // make a api for buyer role user 
        app.get("/users/buyer/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.userType === "Buyer" });
            console.log(user)
        })

        app.get("/users/seller/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            console.log(user)
            res.send({ isSeller: user?.userType === "Seller" });
        })
        // create api for verify user and it can be done if the user is admin 
        app.put("/users/admin/:id", verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user.role !== "admin") {
                res.status(403).send({ message: "forbidden access" })
            }
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    verify: "verified"
                }

            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options)
        });
        // delet a user(seller or buyer) by admin 
        app.delete("/users/admin/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = ({ _id: ObjectId(id) })
            const result = await usersCollection.deleteOne(query);
            if (result.deletedCount === 1) {
                console.log("Successfully deleted one user.");
            } else {
                console.log("No documents matched the query. Deleted 0 documents.");
            }
            res.send(result)
        });
        // api for delete my products elements 
        app.delete("/product/seller/:id", async (req, res) => {
            const id = req.params.id;
            const query = ({ _id: ObjectId(id) })
            const result = await productsCollection.deleteOne(query);
            res.send(result)
        });
        // api for for post booking info from client site 
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
        });
        // Api for payment 
        app.get("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking)
        });

        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types":[
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        });
        app.post("/payments",async(req,res)=>{
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.paidId;
            const filter ={_id:ObjectId(id)}
            const updatedDoc={
                $set:{
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await bookingCollection.updateOne(filter,updatedDoc)
            res.send(result);
        })

    }
    finally {

    }
}
run().catch(console.log)


app.listen(port, () => console.log(`Gadget-&-gears-running port ${port}`));