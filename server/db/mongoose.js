var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, {
  //useMongoClient: true,
  useNewUrlParser: true,
  useFindAndModify: false
  /* other options */
}).catch((e) => {
     console.log(e);
   });

module.exports = {mongoose};
