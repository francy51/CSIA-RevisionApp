var express = require('express');
var router = express.Router();
var Group = require('../models/group.js')
var User = require("../models/user.js")
var { check, validationResult } = require("express-validator/check")

/* GET home page. */
router.get('/', function(req, res, next) {

    Group.find({ "info.isended": false }).sort('-info.startdate').exec(function(err, posts) {
        if (err) console.log(err);

        res.render('index', { title: 'Study Group App', user: req.user, group: posts });
    });
});


//Middlerware to check if the user is logged in otherwise redirect them to the login page
router.use(function(req, res, next) {
    if (req.user == null) {
        // console.log(req.user)
        res.redirect('/login')
    }
    else {
        next();
    }
})

//Send the form used to create the study group
router.get('/newStudyGroup', function(req, res) {
    // console.log(req.user)
    res.render('studyAppForm', { user: req.user });
});

//Post route to create a new study group
router.post('/newStudyGroup', [
    check('StudyName').exists(),

    check("StudySubject").exists(),

    check('startDate').exists(),

    check('lng').exists().isNumeric(),
    check('lat').exists().isNumeric()
], (req, res) => {




    const errors = validationResult(req);

    console.log(errors.array());
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array(), body: req.body });
    }


    var creatorid = req.user._id;
    var lng = req.body.lng;
    var lat = req.body.lat;
    // console.log(lat)
    // console.log(lng)
    var creationDate = new Date();
    var startDate = new Date(req.body.startDate);
    var studyGroupName = req.body.StudyName;
    var studyGroupSubject = req.body.StudySubject;
    //console.log(studyGroupName + "::" + studyGroupSubject + lat + "::" + lng + creationDate + "::" + startDate + creatorid + "::" + creatorid)

    var newGroup = new Group();

    newGroup.info.creatorid = creatorid;
    newGroup.info.location.lng = lng;
    newGroup.info.location.lat = lat;
    newGroup.info.creationdate = creationDate;
    newGroup.info.startdate = startDate;
    newGroup.info.groupname = studyGroupName;
    newGroup.info.groupsubject = studyGroupSubject.toLowerCase();
    newGroup.people = [creatorid];
    newGroup.info.isended = false

    //console.log(newGroup)

    newGroup.save(function(err) {
        if (err)
            throw err;
    })


    res.redirect('/rankedGroups')
});

//Returns a list of all groups that haven't ended
router.get('/StudyGroups', function(req, res, next) {
    Group.find({ "info.isended": false }).sort('-info.startdate').exec(function(err, posts) {
        if (err) console.log(err);

        res.render('StudyGroupList', { group: posts, user: req.user })
    });
});

//used to rate a specific group
router.get('/rate/:id', function(req, res, next) {

    Group.find({ _id: req.params.id, 'info.isended': true }, function(err, group) {

        let names = {}
        User.find({}).exec(function(err, users) {
            if (err) console.log(err);

            for (let i = 0; i < users.length; i++) {
                names[users[i]._id] = users[i].local.username;
            }
            let people = group[0].people

            var index = people.indexOf(req.user._id);
            if (index > -1) {
                people.splice(index, 1);
                res.render('rateform', { people: people, names: names, id: req.params.id, user: req.user });
            }
            else {
                // console.log(people)
                //Not in this group noth allowed to rate it
                res.redirect('/allGroups')

            }
        });


    })
});

//used to process the rating form completed by the user and register the user input
router.post('/rate', function(req, res, next) {
    let groupId = req.body.groupid;
    let groupRating = req.body.groupOverallRating;

    let rObj = req.body

    //Get rid of the first two responses since its data that we already have colelcted
    delete rObj.groupid
    delete rObj.groupOverallRating



    //Set the rating into range of 0 - 1
    let normalizedRating = groupRating / 5;


    //Now all I have to do is add the object as is into the database since its already in the right format.
    console.log(rObj);
    for (var rating in rObj) {

        User.update({ _id: req.user._id }, { $push: { ratings: { id: rating, rating: parseInt(rObj[rating]) } } }, function(err, raw) {
            if (err) throw (err);
            //console.log('The raw response from Mongo was ', raw);
        });
    }



    res.redirect('/')

});

//Returns all the groups 
router.get('/allGroups', function(req, res) {
    let names = {}
    User.find({}).exec(function(err, users) {
        if (err) console.log(err);

        for (let i = 0; i < users.length; i++) {
            names[users[i]._id] = users[i].local.username;
        }

        Group.find({}).sort('-info.startdate').exec(function(err, posts) {
            if (err) console.log(err);
            // console.log(names)
            res.render('StudyGroupList', { group: posts, user: req.user, usernames: names })
        });
    })
})

//used to joing the group passes group id and the NN input variables
router.get('/join/:id', function(req, res, next) {

    // Implement checks on the join function
    Group.update({ _id: req.params.id, "info.isended": false }, { $push: { people: req.user._id } }, function(err, raw) {
        if (err) throw (err);
        //console.log('The raw response from Mongo was ', raw);
    });
    req.session.group = req.params.id;

    req.session.save(function(err) {
        // session saved
    })
    res.redirect('/rankedGroups')
});

//used to end the group
router.get('/endgroup/:id', function(req, res, next) {
    // Implement checks on the join function
    Group.update({ _id: req.params.id, 'info.creatorid': req.user._id }, { $set: { 'info.isended': true } }, function(err, raw) {
        if (err) throw (err);
        //console.log('The raw response from Mongo was ', raw);
        //Nothing in db changed therefor either he is not the creator of the group and therefor can't end it or he has the wrong group id
        if (raw.n == 0) {
            // console.log(raw.n)
            res.redirect('/StudyGroups')

        }
        else {
            req.session.group = null
            req.session.save(function(err) {
                // session saved
            })
            res.redirect('/rate/' + req.params.id);
        }
    });

})

//Returns all available groups in a ranked fashion
router.get('/rankedGroups', function(req, res) {

    // Create an object with every users id and for each of their ratings
    var userIDList = []
    //neeeded for rendering
    var names = {}

    var calculatedUserData = {}

    User.find({}, '_id ratings local', function(err, users) {
        if (err) console.log(err);
        //console.log(users[0]._id)
        for (let i = 0; i < users.length; i++) {
            userIDList.push(users[i]._id);
            names[users[i]._id] = users[i].local.username;

            let baseRateObj = {}
            //Parsing rating object so that it is formated correctly
            for (let r = 0; r < users[i].ratings.length; r++) {
                baseRateObj[users[i].ratings[r].id] = users[i].ratings[r].rating
            }
            // console.log(baseRateObj)
            //storing all the users data within associative arrays
            calculatedUserData[users[i]._id].ratings = baseRateObj;
            calculatedUserData[users[i]._id].age = calculateAge(users[i].local.birth);
        }


        //Find the similarity score for each person and then create an object containing all the similarity scores
        for (let u = 0; u < userIDList.length; u++) {
            //Skip the current user since we don't want a similairty score of himself vs himself.
            if (userIDList[u] == req.user._id)
                continue;
            //console.log(userList[u]);
            // console.log(calculatedUserData)

            //Store the user's similarity in teh associative array
            calculatedUserData[userIDList[u]].similarityScore = findSimilarity(calculatedUserData[req.user._id].ratings, calculatedUserData[userIDList[u]].ratings, userIDList)
        }

        // console.log(calculatedUserData);

        //Create object to store group similarity scores
        let groupCalculatedData = {}

        //create a query object to then pass to the find() method
        let query = {}

        //Check if there are any get parameters in the url if there are then change the query object
        if (req.query.filter) {
            query = {
                "info.isended": false,
                "info.groupsubject": req.query.filter.toLowerCase()
            }
        }
        else {
            query = {
                "info.isended": false
            }
        }

        // console.log(query)

        //find the relavent groups depending on the query
        Group.find(query).sort('-info.startdate').exec(function(err, groups) {
            if (err) console.log(err);
            //create a group array for sorting
            var groupArr = []
            for (let index = 0; index < groups.length; index++) {


                let totSim = 0;
                let totAge = 0;
                let ageCount = 0;

                //calculate avverages
                //average similarity
                for (let pIndex = 0; pIndex < groups[index].people.length; pIndex++) {
                    totSim += calculatedUserData[groups[index].people[pIndex]].similarityScore

                    //Only increase the average age if the person actuall has their age recorded

                    //If user has age recorded
                    if (calculatedUserData[groups[index].people[pIndex]].age != null) {
                        totAge += calculatedUserData[groups[index].people[pIndex]].age;

                        ageCount += 1
                    };
                }
                //Divide the total by the length of people array aka number of similarity scores
                //Place the average similarity into the groups object
                //Do not save this to database since similarity score changes for every user and needs to be calculated everytime
                let avgSim = totSim / groups[index].people.length

                //push collection into array so that it can be sorted
                groupArr.push([groups[index]._id, avgSim])

                //update group object to contain averages
                groups[index].avgSim = (avgSim * 5).toFixed(2);
                groups[index].avgAge = (totAge / ageCount).toFixed(0);
                // console.log(groupCalculatedData)
                //Also records everyones age
                // console.log(groupCalculatedData);
            }

            // Sort the array based on the second element
            groupArr.sort(function(first, second) {
                return second[1] - first[1];
            });

            //Reorder the groups in another array based on their rating. 
            let renderArr = []
            // console.log(groupArr)
            //Order the array
            for (let index = 0; index < groupArr.length; index++) {
                for (let x = 0; x < groups.length; x++) {
                    if (groups[x]._id == groupArr[index][0]) {
                        renderArr.push(groups[x]);
                    }
                }
            }

            // console.log(renderArr)
            //Render the final page and pass in all nececary variables.
            res.render('StudyGroupList', {
                group: renderArr,
                usernames: names,
                user: req.user,
                filter: req.query.filter
            });
        })

    })
})

//Route used to update user birthday data
router.post('/inputBirthDate', function(req, res, next) {
    let birthday = req.body.birth;


    User.update({ _id: req.user._id }, { $set: { "local.birth": birthday } }, function(err, raw) {
        if (err) console.log(err);

        res.redirect('/profile')
    })

})

//Functions used to find the similarity score of two users
//The similarity is found using pearsons corelation formula
function findSimilarity(user1, user2, IDList) {

    // Sum of each persons ratings
    // The sum of the square of each rating
    // The sum of the products
    var xSum = 0;
    var ySum = 0
    var xSumSq = 0
    var ySumSq = 0
    var pSum = 0;

    // console.log(user1)
    // console.log(user2)
    // Need to count how people we both have rated
    var n = 0;
    for (var i = 0; i < IDList.length; i++) {
        var personID = IDList[i];
        // As long as person 1 and 2 both rated the same person keep goind
        if (user2[personID] != undefined && user1[personID] != undefined) {

            // Both ratings need to be parsed as ints since when the are stored in the object they are strings
            var ratingX = parseInt(user1[personID]);
            var ratingY = parseInt(user2[personID]);

            // console.log(personID)

            if (!isNaN(ratingX) || !isNaN(ratingY)) {


                // console.log(ratingX)
                // console.log(ratingY)
                // Sum all the ratings
                xSum += ratingX;
                ySum += ratingY;
                // Sum all the ratings squared
                ySumSq += ratingY * ratingY;
                xSumSq += ratingX * ratingX
                // Sum the product of the ratings
                pSum += ratingX * ratingY;
                n++;


            }
            else {
                console.log(ratingX + "-" + ratingY)
            }
        }
    }


    // console.log(xSum + " | " + ySum + " | " + pSum + " | " + ySumSq + " | " + xSumSq + " | " + n)
    //No similarity score can be made since both have never rated the same person
    if (n == 0)
        return 0

    // console.log(pSum, xSum, ySum, n)
    //Split up the numerator and denominator  so we can avoid math errors.
    let numerator = pSum - (xSum * ySum / n);
    let denominator = Math.sqrt((xSumSq - xSum * xSum / n) * (ySumSq - ySum * ySum / n));

    // console.log(numerator)
    // console.log(denominator )
    // console.log(numerator.toString()+ "/" + denominator .toString() + "=" + (numerator / denominator ).toString());

    //Math error >> we choose to return 0 similarity
    if (denominator == 0)
        return 0;
    else
        return numerator / denominator;

}

function calculateAge(birthdayString) { // birthday is a date

    var ageDifMs = Date.now() - Date.parse(birthdayString);
    var ageDate = new Date(ageDifMs); // miliseconds from epoch

    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

module.exports = router;
