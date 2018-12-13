var mongoose = require('mongoose');

var groupSchema = mongoose.Schema({
    info: {
        groupname: String,
        groupsubject: String,
        creatorid: String,
        creationdate: Date,
        startdate: Date,
        location: {
            lng: Number,
            lat: Number
        },
        isended: Boolean
    },
    people: [String],
    groupratings: [{
        personid: String,
        rating: Number
    }]
});

module.exports = mongoose.model('Group', groupSchema);
