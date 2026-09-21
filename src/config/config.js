var env = process.env.NODE_ENV || 'development';
var portVar = 3000;

if (env === 'development') {
  if (!process.env.PORT) {
    process.env.PORT = portVar;
  }
  console.log('dev block running');
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/goliathon-results';
}
