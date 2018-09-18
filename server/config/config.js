var env = process.env.NODE_ENV || 'development';
var portVar = 3000;

if (env === 'development') {
  process.env.PORT = portVar;
  console.log('dev block running');
  process.env.MONGODB_URI = 'mongodb://localhost:27017/goliathon-results';
}
