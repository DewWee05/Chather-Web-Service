//express is the framework we're going to use to handle requests
const express = require('express')

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool

const router = express.Router()

const msg_functions = require('../utilities/exports').messaging

const validation = require('../utilities').validation
let isStringProvided = validation.isStringProvided

/**
 * @api {get} /contacts/:memberId Get contacts for a given memberid
 * @apiName GetContacts
 * @apiGroup Contacts
 * 
 * @apiDescription Requests all of the usernames of the contacts for a member
 */
router.get("/get", (request,response, next) => {
    if (request.decoded.memberid === undefined){
        response.status(400).send({
            message: "Missing required information"
        })
        console.log("Not getting corrrect info")
    }
    else if (isNaN(request.decoded.memberid)){
        response.status(400).send({
            message: "memberId should be a number."
        })
        console.log("something is not a number")
    }
    else{
        next()
    }
}, (request, response) => {
    let query = "SELECT Username, FirstName, LastName, MemberID FROM Members WHERE MemberID != $1 AND (MemberID IN (SELECT MemberID_A FROM CONTACTS WHERE MemberID_B = $1 AND Verified = 1) OR MemberID IN (SELECT MemberID_B FROM CONTACTS WHERE MemberID_A = $1 AND Verified  = 1))" 
    let values = [request.decoded.memberid]
    pool.query(query, values)
    .then(result => {
        response.send({
            rowCount: result.rowCount,
            rows: result.rows
        })
    }).catch(err => {
        response.status(400).send({
            message: "SQL Error",
            error: err
        })
        console.log("Some sort of sql error")
    })
});


/**
 * @api {post} /contacts/create Add a contact to the current member
 * @apiName Create Contact
 * @apiGroup Contacts
 * 
 * @apiDescription Given two memberid's, add the two members as contacts
 */
router.post("/create", (request, response, next) => {
    if(request.body.memberIda === undefined || request.body.memberIdb === undefined){
        response.status(400).send({
            message: "Missing memberID a or Missing memberID b."
        })
    }
    else if(isNaN(request.body.memberIda) || isNaN(request.body.memberIdb)){
        response.status(400).send({
            message: "MemberID's must be a number."
        })
    }
    else {
        next()
    }
}, (request, respone, next ) =>{
    let query = 'SELECT Username FROM Members WHERE MemberID = $1 OR MemberID = $2'
    let values = [request.body.memberIda, request.body.memberIdb]

    pool.query(query, values)
    .then(result=>{
        if(result.rowCount !=2){
            response.status(404).send({
                message:"Members not found."
            })
        }
        else{
            next()
        }
    }).catch(error=>{
        response.status(400).send({
            message: "SQL Error on memberid check",
            error: error
        })
    })
}, (request, response, next) => {
    let query = 'SELECT Verified FROM Contacts WHERE (MemberId_A = $1 AND MemberId_B = $2) OR (MemberId_B = $1 AND MemberId_A= $2)'
    let values = [request.body.memberIda, request.body.memberIdb]

    pool.query(query, values)
    .then(result => {
        if(result.rowCount != 0){
            response.status(400).send({
                message:"Contact already exists. already exists"
            })
        } else{
            next()
        }
    }).catch(err => {
        response.status(400).send({
            message:"SQL Error on contact verification check"
        })
    })
}, (request, response) => {
    let query = "INSERT INTO Contacts(MemberID_A, MemberID_B) VALUES ($1, $2)"
    let values = [request.body.memberIda, request.body.memberIdb]

    pool.query(query, values)
    .catch(err => {
        response.status(400).send({
            message:"SQL Error on insert."
        })
    })
});

/**
 * @api {delete} /contacts/delete Delete a contact from the current member's contacts list
 * @apiName Delete Contact
 * @apiGroup Contacts
 * 
 * @apiDescription The desired contact to delete
 */
router.post("/delete", (request, response, next) => {
    if(isStringProvided(request.body.memberid)){
        response.status(400).send({
            message: "Missing memberid."
        })
    }
    else{
        next()
    }
}, (request, response, next) => {
    let query = 'SELECT Verified FROM Contacts WHERE (MemberId_A = $1 AND MemberId_B = $2) OR (MemberId_B = $1 AND MemberId_A= $2)'
    let values = [request.body.memberid, request.decoded.memberid]

    pool.query(query, values)
    .then(result => {
        if(result.rowCount == 0){
            response.status(400).send({
                message: "There is no contact with these members."
            })
        }
        else{
            next()
        }
    }).catch(error => {
        response.status(400).send({
            message: "SQL Error on searching for the contact"
        })
    })
}, (request, response) => {
    let query = 'DELETE FROM Contacts WHERE (MemberId_A = $1 AND MemberId_B = $2) OR (MemberId_B = $1 AND MemberId_A= $2)'
    let values = [request.body.memberid, request.decoded.memberid]

    pool.query(query, values)
    .then(result => {
        response.status(200).send({
            message: "Contact deleted."
        })
    }).catch(error => {
        response.status(400).send({
            message: "SQL error on deleting the contact.",
            error: error
        })
    })
});


/**
 * @api {findsinglechat} /contacts/1v1 chat Find a chat room
 * @apiName Find a single chat room
 * @apiGroup Contacts
 * 
 * @apiDescription Given two memberid's, remove the two members as contacts
 */
router.post("/1v1chat", (request, response, next) => {
    if(isStringProvided(request.body.memberId)){
        next()
    }
    else{
        response.status(400).send({
            message: "Missing member id"
        })
    }
}, (request, response, next) => {
    if(isNaN(request.body.memberId)){
        response.status(400).send({
            message: "Member ids must be numbers."
        })
    }
    else{
        next()
    }
}, (request, response, next) => {
    let query = "SELECT Username FROM Members WHERE MemberID = $1 OR MemberID = $2"
    let values = [request.body.memberId, request.decoded.memberid]
    pool.query(query, values)
    .then(result => {
        if(result.rowCount == 2){
            next()
        }
        else{
            response.status(400).send({
                message: "One or both of the members do not exist."
            })
        }
    })
}, (request, response) => {
    let query = "SELECT ChatID FROM ChatMembers WHERE (SELECT Count(*) FROM ChatMembers )"
});



/**
 * @api {Search} /contacts/search Find a user
 * @apiName Search Contact
 * @apiGroup Contacts
 * 
 * @apiDescription Given a username or a email address, find the user associated with it.
 */
router.get("/search", (request, response, next) => 
{
    if(isStringProvided(request.body.searchParam))
    {
        next()
    }
    else
    {
        response.status(400).send({
            message: "Need a search paramter."
        })
    }
}, (request, response) => {
        if(isValidEmail(request.body.searchParam))
        {
            let query = "SELECT MemberID, Username FROM Members WHERE Email = $1"
            let values = [request.body.searchParam]
            pool.query(query,values)
            .then(result =>
                {
                    response.send({
                        rows: result.rows
                    })
                })
                .catch(error =>{
                    response.status(400).send({
                        message: "SQL error while looking for email address",
                        error: error
                    })
                })
    }
    else
    {
        let query = "SELECT MemberID, Username FROM Members WHERE Username = $1"
        let values = [request.body.searchParam]
        pool.query(query,values)
        .then(result =>
            {
                response.send({
                    rows: result.rows
                })
            })
            .catch(error =>{
                response.status(400).send({
                    message: "SQL error while looking for email address",
                    error: error
                })
            })
    }
});

/**
 * @api {Verify} /contacts/verify Verify a contact 
 * @apiName Search Contact
 * @apiGroup Contacts
 * 
 * @apiDescription Given a username or a email address, find the user associated with it.
 */
router.post("/verify", (request, response, next) => {
    if(isStringProvided(request.body.memberIda) && isStringProvided(request.body.memberIdb))
    {
        next()
    }
    else
    {
        response.status(400).send({
            message: "Missing a memberid"
        })
    }
}, (request, response, next) => {
    if(isNaN(request.body.memberIda) || isNaN(request.body.memberIdb)){
        response.send(400).send({
            message: "MemberID's must be a number."
        })
    }
    else
    {
        next()
    }
}, (request, response, next) => {
    let query = "SELECT PrimaryKey FROM Contacts WHERE (MemberID_A = $1 AND MemberID_B = $2) OR (MemberID_A = $2 AND MemberID_B = $1)"
    let values = [request.body.memberIda, request.body.memberIdb]
    pool.query(query, values)
    .then(result => {
        if(result.rowCount > 1){
            next()
        }
        else{
            response.status(400).send({
                message: "Contacts don't exist."
            })
        }
    })
    .catch(error => {
        response.status(400).send({
            message: "SQL Error looking for the contact",
            error: error
        })
    })
}, (request, response) => 
{
    let query = "UPDATE Contacts SET Verified = 1 WHERE (MemberID_A = $1 AND MemberID_B = $2) OR (MemberID_A = $2 AND MemberID_B = $1)"
    let values = [request.body.memberIda, request.body.memberIdb]
    pool.query(query, values)
    .then(result => {
        response.status(200).send({
            message: "Record updated"
        })
    })
    .catch(error =>{
        response.status(400).send({
            message: "SQL Error updating verification",
            error: erorr
        })
    })
});
module.exports = router