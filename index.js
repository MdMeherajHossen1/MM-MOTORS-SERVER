const express = require('express')
const app = express();
const cors = require('cors')
const port = process.env.PORT || 5000;
const admin = require("firebase-admin");
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config()

// MiddleWare
app.use(cors())
app.use(express.json())


const serviceAccount = require("./mm-motors-ltd-firebase-adminsdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function varifyToken(req, res, next) {
    if (req?.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        console.log(token)
        try {

            const decodedUser = await admin.auth().verifyIdToken(token);
            console.log(decodedUser.email)
            req.decodedEmail = decodedUser.email
        }
        catch {

        }
    }
    next()
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vtipi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



async function run() {
    try {
        await client.connect()
        const database = client.db('mm_motors')
        const carsCollection = database.collection('cars')
        const orderCollection = database.collection('orders')
        const usersCollection = database.collection('users')
        const reviewCollection = database.collection('review')


        // Cars POST API
        app.post('/cars', async (req, res) => {
            const result = await carsCollection.insertOne(req.body);
            res.json(result)
        })

        // Cars get API
        app.get('/cars', async (req, res) => {
            const id = req.query.id
            const query = { _id: ObjectId(id) }
            let result;
            if (id) {
                result = await carsCollection.find(query).toArray()
            }
            else {
                result = await carsCollection.find({}).toArray();
            }
            res.send(result)

        })

        // Car delete API 
        app.delete('/cars/:id', async (req, res) => {
            const id = req.params.id;
            const result = await carsCollection.deleteOne({ _id: ObjectId(id) })
            res.json(result)
        })

        // Review POST API
        app.post('/review', async (req, res) => {
            const result = await reviewCollection.insertOne(req.body)
            res.json(result)
        })

        // Review GET APT
        app.get('/review', async (req, res) => {
            const result = await reviewCollection.find({}).toArray()
            res.json(result)
        })

        //    orders POST API
        app.post('/orders', async (req, res) => {
            console.log(req.body)
            const result = await orderCollection.insertOne(req.body)
            res.send(result)
        })
        // Orders GET API
        app.get('/orders', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            let result;
            if (email) {
                result = await orderCollection.find(query).toArray()
            }
            else {
                result = await orderCollection.find({}).toArray()
            }

            res.send(result)
        })

        // Orders deleted API
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id
            const result = await orderCollection.deleteOne({ _id: ObjectId(id) })
            res.send(result)
            console.log(result)
        })

        // saved information of users
        app.post('/users', async (req, res) => {
            const users = await usersCollection.insertOne(req.body)
            res.json(users)
        })
        app.put('/users', async (req, res) => {
            const user = req.body
            const filter = { email: user.email }
            const options = { upsert: true };
            const updateDoc = { $set: user }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.send(result)

        })

        app.put('/users/admin', varifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            console.log(requester)
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester })
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email }
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc)
                    res.send(result)
                }
            }
            else {
                res.status(401).json({ message: 'you do not have access to make admin' })
            }

        })

        // admin API

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }

            const user = await usersCollection.findOne(query)
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.send({ admin: isAdmin })
        })
        // send users information
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find({}).toArray()
            res.json(result)
        })
    }
    finally {
        //    await   client.close()
    }
}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('MM MOTORS LTD server is running on the internet')
})

app.listen(port, () => {
    console.log('port is running on  the ', port)
})