var express = require('express');
app_page = require('../app.js');
var router = express.Router();
var fs = require('fs');
var functions = require('../functions.js');
reader = app_page.reader;
writer = app_page.writer,
starter = app_page.starter,
stopper = app_page.stopper,
name_setter = app_page.name_setter,
killer = app_page. killer,
reviver = app_page.reviver,


router.get('/write/*',function(req,res) {
  killer(req,res);
});
router.get('/read',function(req,res) {
  reader(req,res);
});
router.get('/read',function(req,res) {
  reader(req,res);
});
router.get('/read',function(req,res) {
  reader(req,res);
});
router.get('/read',function(req,res) {
  reader(req,res);
});

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

//this is hacky and there has to be a better way to do it but it works. so for now, it stays.
router.get('/daniel', function(req, res){
	indexer = fs.readFileSync('views/daniel.html').toString()
  res.send(indexer);
});

router.get('/debug', function(req, res){
  indexer = fs.readFileSync('views/debug.html').toString()
  res.send(indexer);
});

router.post('/senddata', functions.setstuff, function(req, res, next) {
  console.log("this is the router, why doesn't this print anything?: " + req.body);
  res.send("Working on it...");
});

router.get('/cv', function(req, res) {
  indexer = fs.readFileSync('views/cv.html').toString()
  res.send(indexer);
});

module.exports = router;
