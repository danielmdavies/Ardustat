var express = require('express');
app_page = require('../app.js');
var router = express.Router();
var fs = require('fs');
var functions = require('../functions.js');
reader = functions.reader;
writer = functions.writer,
starter = functions.starter,
stopper = functions.stopper,
name_setter = functions.name_setter,
reviver = functions.reviver,

// urls for forwarder - serialport interactions. 
router.get('/write/*',function(req,res) {
  writer(req,res);
});
router.get('/read/',function(req,res) {
  reader(req,res);
});
router.get('/startCSV/*',function(req,res) {
  starter(req,res);
});
router.get('/stopCSV/',function(req,res) {
  stopper(req,res);
});
router.get('/setName/*',function(req,res) {
  name_setter(req,res);
});
router.get('/killing/',function(req,res) {
  functions.killer(req,res);
});
router.get('/pauser/',function(req,res) {
  functions.pauser(req,res);
});
router.get('/reviver/',function(req,res) {
  functions.reviver(req,res,functions.flag_resume);
});
router.get('/step_skip/',function(req,res) {
  functions.step_skip(req,res);
});

/* GET home page. */  // changed home page

router.get('/', function(req, res){
  indexer = fs.readFileSync('views/index.html').toString()
  res.send(indexer);
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

//Channel 1 routes
router.get('/Channel1', function(req, res){
	indexer = fs.readFileSync('views/Channel1/index.html').toString()
  res.send(indexer);
});

router.get('/Channel1/CV', function(req, res) {
  indexer = fs.readFileSync('views/Channel1/cv.html').toString()
  res.send(indexer);
});

router.get('/Channel1/Cycler', function(req, res) {
  indexer = fs.readFileSync('views/Channel1/cycler.html').toString()
  res.send(indexer);
});
//killing, pausing, skipping
//kill



//Channel 2 routes - tbdl

module.exports = router;
