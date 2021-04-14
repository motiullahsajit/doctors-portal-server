const express = require('express')
const app = express();
const cors = require('cors');
const fs = require('fs-extra');
const fileUpload = require('express-fileupload');
require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const admin = require("firebase-admin");

app.use(cors());
app.use(express.json());
app.use(express.static('doctors'));
app.use(fileUpload());
const port = process.env.PORT || 5050;



const serviceAccount = require("./configs/doctors-portal-a2e94-firebase-adminsdk-zyhnc-d705bf1db4.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.f1dev.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const appointmentCollection = client.db(`${process.env.DB_NAME}`).collection("appointments");
    const doctorCollection = client.db(`${process.env.DB_NAME}`).collection("doctors");
    const patientCollection = client.db(`${process.env.DB_NAME}`).collection("patients");
    console.log('database connected')

    app.get('/appointments', (req, res) => {
        appointmentCollection.find({})
            .toArray((err, documents) => {
                res.send(documents)
            })
    })

    app.post('/addAppointment', (req, res) => {
        const appointment = req.body;
        appointmentCollection.insertOne(appointment)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })


    app.get('/patients', (req, res) => {
        patientCollection.find({})
            .toArray((err, documents) => {
                res.send(documents)
            })
    })

    app.post('/addPatient', (req, res) => {
        const patient = req.body;
        patientCollection.insertOne(patient)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })

    app.delete('/deleteAppoinment/:id', (req, res) => {
        const id = ObjectID(req.params.id)
        appointmentCollection.deleteOne({ _id: id })
            .then(result => {
                res.send(result.deletedCount > 0);
            })
    })
    
    app.post('/addADoctor', (req, res) => {
        const file = req.files.file;
        const name = req.body.name;
        const email = req.body.email;
        const newImg = file.data;
        const encImg = newImg.toString('base64');

        const image = {
            contentType: file.mimetype,
            size: file.size,
            img: Buffer.from(encImg, 'base64')
        }

        doctorCollection.insertOne({ name, email, image })
            .then(result => {
                res.send(result.insertedCFount > 0)
            })
    })

    app.delete('/removeDoctor/:id', (req, res) => {
        const id = ObjectID(req.params.id)
        doctorCollection.deleteOne({ _id: id })
            .then(result => {
                res.send(result.deletedCount > 0);
            })
    })

    //   to save on local server
    // app.post('/addADoctor', (req, res) => {
    //     const file = req.files.file;
    //     const name = req.body.name;
    //     const email = req.body.email;
    //     file.mv(`${__dirname}/doctors/${file.name}`, err => {
    //         if (err) {
    //             console.log(err);
    //             return res.status(500).send({ msg: 'failed' });
    //         }
    //         doctorCollection.insertOne({ name, email, img: file.name })
    //             .then(result => {
    //                 res.send(result.insertedCount > 0)
    //             })
    //     })
    // })

    app.get('/doctors', (req, res) => {
        doctorCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    });

    app.post('/isDoctor', (req, res) => {
        const email = req.body.email;
        doctorCollection.find({ email: email })
            .toArray((err, doctors) => {
                res.send(doctors.length > 0);
            })
    })

    app.get('/userAppointments', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin
                .auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    if (tokenEmail === queryEmail) {
                        appointmentCollection.find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.status(200).send(documents)
                            })
                    }
                    else {
                        res.status(401).send('un-authorized access')
                    }

                }).catch((error) => {
                    res.status(401).send('un-authorized access')
                });
        }
        else {
            res.status(401).send('un-authorized access')
        }

    })

    app.post('/appointmentsByDate', (req, res) => {
        const date = req.body;
        const email = req.body.email;

        doctorCollection.find({ email: email })
            .toArray((err, doctors) => {
                const filter = { date: date.date }
                if (doctors.length === 0) {
                    filter.email = email;
                }
                appointmentCollection.find(filter)
                    .toArray((err, documents) => {
                        res.send(documents);
                    })
            })
    })

    app.get('/', (req, res) => {
        res.send('database connected')
    })

});



app.listen(port);