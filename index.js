const express = require("express");   /* Accessing express module */
const path = require("path");
const http = require("http");
const app = express();  /* app is a request handler function */
process.stdin.setEncoding("utf8"); 
const bodyParser = require("body-parser"); /* To handle post parameters */
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') })  
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const uri = `mongodb+srv://${userName}:${password}@cluster0.o8tvs34.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};



app.use(express.static(__dirname + '/public'));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

if (process.argv.length != 2) {
    process.stdout.write(`Usage finalServer.js invalid arguments\n`);
    process.exit(1);
}

const portNumber = 5000

app.get("/", async (request, response) => {
    response.render('index')
});
app.post("/", async(request, response)=> {
    let {name, lat, long} = request.body;
    try {
        await client.connect();
        let location = {name: name, latitude: lat, longitude: long};
        await insertLocation(client, databaseAndCollection, location);
        response.redirect('/')
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
})

app.get("/location", async(request, response)=> { 
    options = ""
    try {
        await client.connect();
        let filter = {};
        const cursor = client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
        const result = await cursor.toArray();
        result.forEach(function(k) {
            options += "<option name=" + k.name + ">" + k.name + "</option>"
        })
        response.render("location", {options: options})
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
})

app.post("/location", async(request, response)=> {
    let {name, sun} = request.body;
    try {
        await client.connect();
        let result = await lookUpOneEntry(client, databaseAndCollection, name);   
        let uri = "https://api.sunrisesunset.io/json?lat=" + result.latitude +"&lng=" + result.longitude +"&timezone=UTC&date=today"
        const retrieveParams = await fetch(uri)
        const params = await retrieveParams.json()
        title = "<h3>" + name + "</h3>"
        if (sun === "sunset") {
            image = "<img src=serverStaticFiles/sunset.gif type=\"image/gif\"/>"
            content = "<h2>Sunset</h2>"
            content += params.results.sunset
            response.render("result", {imageBackground: image, content: content, title: title})
        } else if (sun === "sunrise") {
            image = "<img src=serverStaticFiles/sunrise.gif type=\"image/gif\"/>"
            content = "<h2>Sunrise</h2>"
            content += params.results.sunrise
            response.render("result", {imageBackground: image, content: content})
        }else {
            console.error("Did not put correct value");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
})

app.listen(portNumber, ()=> console.info(`Web server started and running at http://localhost:${portNumber}`));
const prompt = "Stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on('readable', () => {  /* on equivalent to addEventListener */
	let dataInput = process.stdin.read();
	if (dataInput !== null) {
        let command = dataInput.trim();
        if (command === "stop") {
			console.log("Shutting down the server");
            process.exit(0);  /* exiting */
        } else {
			/* After invalid command, we cannot type anything else */
			console.log(`Invalid command: ${command}`);
		}
        process.stdout.write(prompt);
        process.stdin.resume();
    }
});


async function insertLocation(client, databaseAndCollection, location) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(location);
}

async function lookUpOneEntry(client, databaseAndCollection, name) {
    let filter = {name: name};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
    return result
}
