const fs = require('fs');
const fsa = require('fs/promises');
const path = require('path');
const cors = require('cors');

const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const workingDir = __dirname

// This webserver makes exclusive use of express, an api for nodejs webservers. It completely replaces the http and https tools!

// This webserver is a janky social media site with a front page, posting page, and a search tool


// Function to read directories and spit out a list sorted by date
async function listFilesSortedByDate(directory) {
    try {
        // Read directory contents
        const files = await fsa.readdir(directory);

        // Get metadata for each file
        const fileStatsPromises = files.map(async (file) => {
            const filePath = path.join(directory, file);
            const stats = await fsa.stat(filePath);
            return { file, createdAt: stats.birthtime };
        });

        const fileStats = await Promise.all(fileStatsPromises);

        // Sort files by creation date
        fileStats.sort((a, b) => a.createdAt - b.createdAt);

        // Extract filenames in sorted order
        const sortedFiles = fileStats.map(fileStat => fileStat.file);

        return sortedFiles;
    } catch (error) {
        console.error('Error reading directory or getting file stats:', error);
        throw error;
    }
}


// Sets API post/send limits. Up to 10mb is allowed to ensure proper image transportation!
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true })); 

// Sets API to listen on port 3000
app.listen(3000, ()=>{
    console.log(`Server running at http://localhost:3000/`);
});

// Below are all the static pages you can access! These include home/main, new-post, search, about, and the favicon
app.get("/home", (req, res) => {
    fs.readFile('html/mainpage.html', function(err, data) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
      });
});

app.get("/new-post", (req, res) => {
    fs.readFile('html/newpost-page.html', function(err, data) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
      });
});

app.get("/search", (req, res) => {
    fs.readFile('html/search.html', function(err, data) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
      });
});

app.get("/about", (req, res) => {
    fs.readFile('html/about.html', function(err, data) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
      });
});

app.get("/favicon.png", (req, res) => {
    fs.readFile('images/favicon.png', function(err, data) {
        res.writeHead(200, {'Content-Type': 'image/png'});
        res.write(data);
        return res.end();
      });
});



// Below are all of the JSON senders, IE post data, search queries, etc.

// This function handles search queries
app.get("/search/:id", (req, res) => { // <-- Search query comes in
    const { id } = req.params // <-- Search query is pulled from requested URL
    const searchParams = id.split(".~."); // Query is seperated by the characters: .~. (I chose these characters for their uniqueness)

    let matchingPostList = [];

    fs.readdir('content/allPosts', (err, files) => { //Reads all files in the /content/allPosts dir
        if (err) {
            res.status(500).send({ // If read fails, send error message
                matchingPosts: "Error"
            });
            return console.error('Unable to scan directory: ' + err);
        }

        files.forEach(file => { // This function checks each filename to see if it matches any of the search query parameters

            const parts = file.split(".~.");

            const c1 = searchParams[0] == 'undefined' || parts[0] == searchParams[0];
            const c2 = searchParams[1] == 'undefined' || parts[1] == searchParams[1];
            const c3 = searchParams[2] == 'undefined' || parts[2] == searchParams[2];

            if (c1 && c2 && c3) { // If the parameters are met, then the file is added to the matchingPostList
                matchingPostList.push(file)
            }

        });

        if (matchingPostList.length > 0) { // Now the post names are sent. If there are posts in the list, then the list will be sent... if not, the string "No Posts" will be sent!
            res.status(200).send({
                matchingPosts: matchingPostList
            });
        } else {
            res.status(200).send({
                matchingPosts: "No Posts"
            });
        }  

    });

});


// This function handles post requests; it will gather all post names in the /content/allPosts folder and send them to the requesting user.
app.get('/posts', (req, res) => {

    listFilesSortedByDate('content/allPosts/').then(data => { // Access files from content/allPosts, then return a list sorted by date
        let posts = data.reverse()

        res.status(200).send({ // Send the sorted list
            postTitles: posts
        });
        
    }).catch(error => { // If there was a problem in sorting the list, or accessing the files, the message Error 500 will be returned
        console.error('Error listing files:', error);

        let posts = "Error 500"

        res.status(500).send({
            postTitles: posts
        });
    });

});

// This function handles new post requests. The 5 newest posts posted will be added to the folder content/newPosts. This function pulls the file names from that folder.
app.get('/posts/new-posts', (req, res) => {
    fs.readdir(`${workingDir}/content/newPosts`, (err, files) => {
        if (files) {
            posts = files

            res.status(200).send({
                postTitles: posts
            });

        } else {
            posts = "Error 500"

            res.status(500).send({
                postTitles: posts
            });
        }
    }); 

});

// This function handles sending actual post data. 
app.get('/posts/:id', (req, res) => {
    const { id } = req.params // Request id is pulled from URL
    console.log(id)

    try {
        let data = fs.readFileSync(`${workingDir}/content/allPosts/${id}`, 'utf8') // Read the file
        data = JSON.parse(data) // Parse the JSON data
        // console.log(data)
        res.status(200).send({
            data // Send the JSON data
        });
    } catch (error) {
        console.log(error) // If any errors occur, the server will return a "post not found" message.
        res.status(404).send({
            message: "Post Not Found"
        });
    }
});

// This function does the same thing as the one above, but just for the new-posts dir
app.get('/posts/new-posts/:id', (req, res) => { 
    const { id } = req.params 
    console.log(id)

    try {
        let data = fs.readFileSync(`${workingDir}/content/newPosts/${id}`, 'utf8')
        data = JSON.parse(data)
        console.log(data)
        res.status(200).send({
            data
        });
    } catch (error) {
        console.log(error)
        res.status(404).send({
            message: "Post Not Found"
        });
    }

    
});


// This is the biggie!
// This function handles all incoming posts...
// When a user creates a new post it comes here to be saved to the server...
app.post('/posts/:id', (req, res) => { // New post request is made
    console.log(req.params)
    console.log(req.body)
    const { id } = req.params; // Post file name pulled from the url
    const { postTitle } = req.body; // Post title, text, etc. pulled from post body
    const { postText } = req.body;
    const { postImage } = req.body;
    const { postSignature } = req.body;
    let proceed = false

    if (!postText && !postImage) { // Logic checks if post has either text or image
        res.status(400).send({
            message: "No Post Body",
            ok: false
        });
    } else if (!postTitle) { // Logic checks if posts has a title
        res.status(400).send({
            message: "No Post Title",
            ok: false
        });
    } else { // If post title and content are found, logic proceeds
        proceed = true
        res.status(200).send({ // Sends a confirmation message that post info was received!
            message: "Post Created! Posting as " + postSignature + "...",
            ok: true
        })

        console.log(id, postTitle, postText, postSignature);

        let postData = { // Post data object is created
            "postTitle": postTitle,
            "postText": postText,
            "postImage": postImage,
            "postSignature": postSignature
        }

        let jsonData = JSON.stringify(postData, null, 2); // Post data object stringified for usablility

        fs.writeFile(`content/newPosts/${id}.json`, jsonData, 'utf8', (err) => { // Create a new file in the newPosts dir with the url/id as the filename and the jsonData object as the data saved in the file
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log(`File content/newPosts/${id}.json has been saved.`);
            }
        });
        
        listFilesSortedByDate('content/newPosts/').then(data => { // Check the posts in the newPosts dir
            const oldestFile = data[0];
            if (data.length >= 5) { // The oldest post is selected
                fs.rename(`content/newPosts/${oldestFile}`, `content/allPosts/${oldestFile}`, (err) => { // The oldest post is moved to allPosts dir
                    if (err) {
                        console.error('Error moving file:', err);
                    } else {
                        console.log(`File moved: ${oldestFile}`);
                    }
                });
            }
        }).catch(error => {
            console.error('Error listing files:', error);
        });
    };
});

// This function returns a 404 page if any unaccounted for URLs are requested
app.use((req, res, next) => {
    fs.readFile('html/unknownPage.html', function(err, data) {
        res.writeHead(404, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
      });
});