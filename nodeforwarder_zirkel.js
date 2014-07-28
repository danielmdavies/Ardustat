/* 
NodeForwader: an serial to http proxy driven by ghetto get calls
requirements 
   -- serialport -> npm install serialport
   -- express -> npm install express
   -- sleep -> npm install sleep

to start: node nodeforwader.js [HTTP PORT] [SERIAL PORT] [BAUD] [BUFFER LENGTH]
to read: http://[yourip]:[spec'd port]/read/  -> returns the last [BUFFER LENGTH] bytes from the serial port as a string
to write: http://[yourip]:[spec'd port]/write/[YOUR STRING HERE]

what will probably create farts/list of things to deal with later if I need to:
- returning characters that html has issues with
- spaces in the url

*/

parts = process.argv

var ts = new Date().getTime();

if (parts.length < 6)
{
	console.log("usage: node nodeforwader.js [HTTP PORT] [SERIAL PORT] [BAUD] [BUFFER LENGTH]") // buffer length usually 300
	process.exit(1);
}

else
{
	console.log(parts);
	hp = parts[2]
	sp = parts[3]
	baud = parseInt(parts[4])
	blen = parseInt(parts[5])
}

var express = require('express');
var app = express();

app.listen(hp);

var sleep = require("sleep").sleep;
var SerialPort = require("serialport").SerialPort ;
var serialPort = new SerialPort(
	sp, 
	{
		baudrate: baud		
	}
);

serialPort.on("open", function () { 
	console.log('open');
    
});  

//sleep for 5 seconds for arduino serialport purposes
for (var i=0; i<5; i++ )
{
	console.log(i);
	sleep(1); 
}


//On Data fill a circular buf of the specified length
buf = ""
serialPort.on('data', function(data) {
   ts = new Date().getTime();
   buf += data;
   var n = buf.indexOf("ST.");
   buf = buf.substr(0,n+2)+","+ts+","+buf.substr(n+3,buf.length);
   if (buf.length > blen) buf = buf.substr(buf.length-blen,buf.length);
   });

//Write to serial port
app.get('/write/*',function(req,res){	
	toSend = req.originalUrl.replace("/write/","")
	toSend = decodeURIComponent(toSend);
	queue.push(toSend);
	res.send(toSend)
});

var queue = [];

setInterval(function() {},5);

setInterval(function(){
if (queue.length != 0) {
    serialPort.write(queue.pop());
    }}, 10);
    
setInterval(function(){
queue.push('s0000');
},50);
//read buffer
app.get('/read/', function(req, res){
	res.send(buf)
});
