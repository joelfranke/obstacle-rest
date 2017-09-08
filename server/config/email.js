'use strict';
var nodemailer = require('nodemailer');
// const xoauth2 = require('xoauth2')

var email = function sendMail (body) {

let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: 'joelfranke@gmail.com',
        pass: 'jdomenica1'
    },
    tls:{
        secureProtocol: "TLSv1_method"
    }
});
    transporter.verify(function(error, success) {
       if (error) {
            console.log(error);
       } else {
            console.log('Server is ready to take our messages');
       }
    });

    'use strict';
    // setup email data with unicode symbols
    let mailOptions = {
        from: '"goliathon-duplicate" <joelfranke@gmail.com>', // sender address
        to: 'joelfranke@gmail.com', // list of receivers
        subject: 'Goliathon Duplicate', // Subject line
        text: body, // plain text body
        html: body // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        return console.log('Message sent: %s', info.messageId);

    });
}

module.exports = {email};
