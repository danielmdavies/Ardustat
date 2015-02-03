config_page = require('./config.js')
//TODO: calibration, pulse charging
//TODO: check how python does things, fix calibration
// make the javascript stuff way nicer - i think that this is key. 
//requirements from npm
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mkdirp = require('mkdirp');
var sleep = require('sleep').sleep;
var url = require('url');
var fs = require('fs');
var sys = require('sys');
var urllib = require('urllib');
var json2csv = require('json2csv');

//ones I probably don't need
var squenty = require('sequenty');
//Serial port stuff and socket stuff
//------------------------------------------------------------------------------------------------------
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;


var listen = function(app) 
{
  var http = require('http').createServer(app).listen(3001);
  global.io = require('socket.io')(http);
  io_connect();
  global.io.on('connection', function(socket){
    socket.on('chat message', function(msg){
      console.log('chat message: ' + msg);
    });
});
}

function io_connect()
{
  global.io.on('connection', function(socket) {
    console.log('holy shit this works');
  });
}

/*(
  console.log('give_status called');
  page = req.body.page
  console.log('give status thinks the page is ' + page);
  var response = ''
  if (kill = true){
    response = 'killed'
  }
  else if (cv = true){
    response = {'type': 'cv',
                'folder' : cv_foldername,
                'file' : cv_filename}
  }
  else if (cycler = true){ //check this is right 
    response = {'type': 'cycle',
                'folder' : cyc_folder_name,
                'file' : cyc_file_name}
  }
  else {
    response = 'something wrong'
  }
  res.send(response)
*/
function give_status(req,res)
{
  console.log('give status called');
  res.send('the status is given here');
}
  

function io_emit(type, msg)
{
  global.io.emit(type, msg);
}


serialport.list(function(err, ports){
  ports.forEach(function(port) {
    console.log(port.comName);
  });
});

var serialPort = new SerialPort('/dev/ttyACM0',{
  baudrate:57600,
  parser:serialport.parsers.readline('\n')
});

module.exports = ({
  serialPort: serialPort
});

serialPort.on("open", function() {
  console.log('serial port opened yay');
	try
  {
	  res_table = JSON.parse(fs.readFileSync("unit_"+id.toString()+".json").toString())
	  console.log("loaded table "+id.toString())
	  //console.log('here is the res_table')
	  //console.log(res_table)
	
	
  }
  catch (err)
  {
	  console.log(err)
	  console.log("no table "+id.toString())
	  res_table = "null"
  }
});

serialPort.on('error', function(err) {
  console.log(err);
});
//-----------------------------------------------------------------------------------
//set some flags so setInterval knows what to do.

var calibrate = false;
var resting = false;
var cv = false;
var arb_cycling = false;

function arb_cycling() {
  console.log('arb cycler called');
}



// serial communications 
//=====================================================================================================
//writer variables initialized
var CSV_ON = false;
var labels = [];
var CSV_NAME = 'Data/untitled.csv';
var CSV_FOLDER = '';
var kill = false;
var command_list = [];
blen = 300; // buffer length

var ts;

var headers = {};
for(var j = 0; j<11;j++) {
	headers[j]=labels[j];
}

var count = 0;
var lastTime = 0;

//TODO: change up python stuff so can accomodate more than one ardustat.

//data getting / parsing stuff 
//--------------------------------------------------------------
//On Data fill a circular buf of the specified length
//Save a dictionary of the last ardustat reading to be used by cv and cycler
buf = ""
last_ardu_reading = {}
var now_time; //needed for write2csv aswell
// TODO: make this more robust.
serialPort.on('data', function(data) {
  //console.log(data);
  if (data.search('GO') > -1)
  {
    parsed_data = data_parse(data);
    last_ardu_reading = parsed_data;
    
    if (calibrate)
    {
      console.log('sent to calibration array');
      //console.log(parsed_data);
      calibration_array.push(parsed_data)
    }
    now_time = new Date().getTime();
    ts = now_time;  //some debugging rubbish
    //console.log('now_time '+now_time.toString());
    //console.log('pause time '+total_pause_time.toString());
    buf += data;
    var n = buf.indexOf("GO.");
    buf = buf.substr(0,n+2)+","+ts+","+buf.substr(n+3,buf.length);
    if (buf.length > blen) buf = buf.substr(buf.length-blen,buf.length);
    //if writing is desired write buf to current CSV_NAME file
    if((CSV_ON == true) && (kill == false)){ 
        write2CSV(buf); 
        //console.log("received data and sent to write2CSV");
      }
   }
});
//data_parse
//Global Functions for Data Parsing
id = 25; //TODO change so that you can set the id of the arudstat
vpt = undefined; //volts per tick
mode = 0;
var res_table;

//Break Arduino string into useful object
function data_parse(data)
{
  if ( typeof (data) == "string")
  {
    parts = data.replace('.', ',');
	  parts = parts.split(",")
	}
	else
	{
	parts = data
	}
	//console.log(parts);
	//console.log(parts[10]); // shoule be twopointfive_adc 
  out = {}
  //GO,102,351,0,255,0,0,s0000,99,102,524,ST
	//the raw data
	//console.log(data)
	out['dac_set'] = parseFloat(parts[1])
	out['cell_adc'] = parseFloat(parts[2])
	out['dac_adc'] = parseFloat(parts[3])
	out['res_set'] = parseFloat(parts[4])
	out['mode'] = parseInt(parts[6]) //TODO check that this is write
	out['gnd_adc'] = parseFloat(parts[8])
	out['ref_adc'] = parseFloat(parts[9])
	out['twopointfive_adc'] = parseFloat(parts[10])
	//out['id'] = parseInt(parts[11])
	out['last_comm'] = last_comm
	mode = out['mode']
	//making sense of it
	//console.log("2.5 adc");
	//console.log(out['twopointfive_adc']);
	volts_per_tick = 	2.5/out['twopointfive_adc']
	//console.log(volts_per_tick);
	if (vpt == undefined) vpt = volts_per_tick;
	/*
	if (id != out['id'])
	{
		id = out['id'];
		res_table = undefined
	}
	*/
    
	//force ocv when dac_set and dac_adc don't match up
  if (out['mode'] != 1 & out['dac_set'] - out['dac_adc'] > 900)
    {
        set_ocv();
    }

	
	out['cell_potential'] = (out['cell_adc'] - out['gnd_adc']) * volts_per_tick
	out['dac_potential'] = (out['dac_adc'] - out['gnd_adc'])*volts_per_tick
	out['ref_potential'] = out['ref_adc']*volts_per_tick
	out['gnd_potential'] = out['gnd_adc']*volts_per_tick
	out['working_potential'] = (out['cell_adc'] - out['ref_adc']) * volts_per_tick
	last_potential = out['working_potential']
	if (calibrate != true)
	{
	  if (res_table == undefined)
	  {
		  try
		  {
			  res_table = JSON.parse(fs.readFileSync("unit_"+id.toString()+".json").toString())
			  console.log("loaded table "+id.toString())
			
			
		  }
		  catch (err)
		  {
			  console.log(err)
			  console.log("no table "+id.toString())
			  res_table = "null"
		  }
	  }
	
	  if (res_table.constructor.toString().indexOf("Object")>-1)
	  {
		  out['resistance'] = res_table[out['res_set']]
		  current = (out['dac_potential']-out['cell_potential'])/out['resistance']
		  if (mode == 1) out['current'] = 0
		  else out['current'] = current
		  last_current = out['current'] //same thing that dan did for the potential
	  }
	}
	return out
}


  

//TODO: if document already exists - don't overwrite?
function write2CSV(chunk) {
  //console.log('write2CSV called');
	//start of document
    //console.log("this is the chunk that gets sent to write2csv ", chunk);
    //TODO: remove this debugging stuff
  fs.appendFile('log.txt',chunk, function (err){
      if (err) throw err;
  });
  //for debug
  if (total_pause_time > 0) fs.appendFileSync('log.txt', 'jimmy \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n')
	if(count==0) {
		//write column headers to csv file (optional) -- using 'writeFile' here to overwrite old data on file
		json2csv({data: headers, fields: ['0','1','2','3','4','5','6','7','8','9','10'], hasCSVColumnTitle: false}, function(err, csv) {
			if (err) console.log(err);
			fs.writeFile(CSV_NAME, csv, function(err) {
				if (err) throw err;
			});
		});
	count=1;
	}

	else{
	
		    var orig = chunk;
		    //if there is still a GO->ST pair left in chunk
		    while(orig.indexOf("GO")!=-1 && orig.indexOf("ST")!=-1) {
			    var start = orig.indexOf("GO");
			    //remove pre-'GO' data from both
			    chunk = orig.substr(start+3,orig.length);
			    orig = chunk;
			    var end = orig.indexOf("ST");
			    //remove post-'ST' data from current chunk
			    chunk = orig.substr(0,end-1);
			    //console.log(chunk+","+count);
			    //remove current chunk from original chunk for later analysis
			    orig = orig.substr(end+2,orig.length);
			    //create array of data values
			    var chunks = chunk.split(",");
          if (parseInt(chunks[0]) < 10000) 
          {
              //console.log("woah chunky timestamp is small");
            fs.appendFile('log.txt', "chunky timestamp is smaller than 10000", function (err) 
            {
              if (err) throw err;
            });
          }
          else 
          {
            
            chunks[0] = parseInt(chunks[0]) - total_pause_time
            //don't write entries more than once
            fs.appendFile('log.txt',"attempting to go into if statement", function (err)
            {
              if (err) throw err;
            });
            if(parseInt(chunks[0])>parseInt(lastTime)) 
            {
	            //count++;
	            foo = {};
	            for(var j = 0; j<11;j++) {
		            foo[j]=chunks[j];
	            }
	            //write data values to appropriate columns in csv 
	            json2csv({data: foo, fields: ['0','1','2','3','4','5','6','7','8','9','10'], hasCSVColumnTitle: false}, function(err, csv) {
		            if (err) console.log(err);
                          //console.log("this is the part from write2CSV that gets written: ",csv);
                          fs.appendFile('log.txt',csv, function (err){
                              if (err) throw err;
                          });
		            fs.appendFileSync(CSV_NAME, csv)
	            });
	            //set lastTime to current time if current time is greater
	            lastTime=chunks[0];
            }
            else
            {
                //console.log("chunks timestamp is less than last time");
                //console.log("chunks[0] is ",chunks[0]," lastTime is ",lastTime);
                fs.appendFile('log.txt','chunks is ' + chunks[0] + " ", function (err){
                    if (err) throw err;
                });
                fs.appendFile('log.txt',' last time is ' + lastTime + " ", function (err){
                    if (err) throw err;
                });
                chunk = '';
                chunks = '';
            }
          }
    }
  }
}
//======================================================================================================
//functions to communicate how urls used to 

function toArd(command,value)
{
	last_comm = ardupadder(command,value)
	//serialPort.write(ardupadder(command,value));	
	l_writer(last_comm)
	console.log(last_comm)
}
function l_writer(stringer) {	
	if(kill==false) {	
        //command = toSend;
//hack to make sure that CSV is turned on - only problem is that it might not know which file to write to - might be better than nothing - anyway i dont think that this is the problem.
//TODO decide what to do with this hack.
        //if ((stringer.indexOf("p") > -1) || (stringer.indexOf("g") > -1)) CSV_ON = true;
        command_list.push(stringer);
        //queue.push(toSend);
    		//serialPort.write(toSend);
	      }
	//TODO make this more robust
	else { console.log("killed :(");
  };
};

function l_reader() { //returns string
  if (kill == false) {
    var reading = buf
    var orig = buf
    if (reading.indexOf("GO")!=-1 && reading.indexOf("ST")!=-1){
	    var start = orig.indexOf("GO");
	    reading = orig.substr(start,reading.length);
	    var temp = reading;
	    orig = reading;
	    var end = orig.indexOf("ST");
	    //remove post-'ST' data from current chunk
	    chunk = reading.substr(0,end+2);
	    //console.log(chunk+","+count);
	    //remove current chunk from original chunk for later analysis
	    reading = reading.substr(end+2,orig.length);
	    //create array of data values
	    var chunks = chunk.split(",");
	    //var temp = reading;
	    //TODO: figure out why this doesn't wanna print - real werid but whatever. Take out all the console checks.
	    //console.info(" why wont this print? ", temp); //this is perhaps the weirdest shit ever.
	    //console.log(reading.length);
	    //console.log("chunks is now " +chunks);
	    //console.info(chunks.length);
	    return chunks;
  }
    else {console.log("something here is fucked with l_reader");
    }
      
  }
  	else { console.log("killed") }
};

//TODO:this is where we can stop overwrites... or send warning to the user... that would be sweet.
function l_starter(folder_file) {
  fs.writeFileSync("log.txt",'hey dan')
  console.log('l_starter has been called');
	if(CSV_ON == false) {
	if(folder_file!="") { CSV_NAME = 'Data/' + folder_file +'.csv'; }

  //stuff to create folder if not already there  
  var CSV_PARTS = CSV_NAME.split("/");
  for (var i = 0; i < CSV_PARTS.length-1; i++)
  {
    CSV_FOLDER += CSV_PARTS[i] + "/";
  }
  CSV_FOLDER = CSV_FOLDER.substring(0,CSV_FOLDER.length-1);
  console.log("CSV_folder "+CSV_FOLDER);
  mkdirp(CSV_FOLDER, function(err) { //TODO: make this recursive - just need to set call-back to make sure that
  //TODO: make sure this is in a callback sequence so that nothing super fucked up happens.
    
  //this might not happen synchronously but it shouldn't matter too much
});
//TODO: add Data folder to git ignore. 
	CSV_ON = true;
	kill = false; // added kill = false to starter.
	//res.send('CSV WRITING HAS BEGUN! Current output file: ' + CSV_NAME);
	console.log('writing data to: ' + CSV_NAME);
	}
	else {
	//res.send('ALREADY WRITING TO FILE: ' + CSV_NAME);
	console.log('something messed up with the startCSV');
	}
};

function l_stopper() 
{
  test_running = false;
	kill = true;
	console.log('method control has been stopped, and CSV writing has been killed');
	CSV_ON = false;
}
//killer, reviver, and skipper are at end where the abstracted functions are.

//============================================================================================================================

//could write a flag that decides if things are already running, if they are - tell the browser to fuck off

var ardustat_id = ''; //TODO urgent - change this so that not automatically set to 25... User selected.
//Maybe only open serial port when user says to?  -- Figure out best way to do this...
//takes in data and sends to right place
function setstuff(req,res)
{
 //TODO urgent - if there is a test running - should tell user and user should have option to stop the test.  
  console.log('the req is' + req.body);
  if (test_running)
  {
    console.log('test running');
  }
  else
  {
    console.log('setstuff called');
    try {
      
      
      if (req.body.ardustat_id_setter != undefined){
        console.log('ardustat_id sent');
        ardustat_id = req.body.ardustat_id_setter;
        out = fs.readdirSync(__dirname);
        if (out.indexOf('unit_'+ardustat_id.toString()+'.json') > -1){
          console.log('res_table is here');
          res.send('res_table is here');
        }
        else {
          console.log("res_table isn't here");
          res.send("res_table isn't here");
        }
      }
      //var parsed = JSON.parse(req.body);
      //console.log(parsed);
    //from the debug page
      else if (req.body.arducomm != undefined){
        //console.log("this is the function setstuff, this is the req.body " +  req.body.arducomm);
        res.send('hello from server');
      }
      
    //checks if abstracted command (cv, cycle etc)
      else if (req.body.electro_function != undefined) 
      {
        console.log('gonna do some ' + req.body.electro_function);
        calibrate = false;
        cv = false
        arb_cycling = false;
        
        //see what the commmand is - then send the values
        command = req.body.electro_function;
        value = req.body
        

        if (command == "calibrate")
	      {
		      console.log("calibration should start");
		      calibrator(req.body.value);
		      res.send('calibration called');
	      }
        //now check what kind of function user wants - and call that function
        if (command == 'cyclic_voltammetry')
        {
          console.log("setting cv now!");
          //for debugging
          console.log(value);
          cv_start_go(value);
          res.send('cyclic voltammetry called');
        }
      }
      
      else if (req.body.cycle_array != undefined) 
      {
        calibrate = false;
        cv = false
        //console.log("req.body.cycle_array");
        var parsed = JSON.parse(req.body.cycle_array);
        //console.log(parsed);
        arb_cycling = true;
        cycling_start_go(parsed);
        res.send('hello')
      }
      else
      {
      console.log("something else was sent");
      console.log(req.body);
      res.send('hello')
      }
    }
    catch (e) {
      console.log(e);
    }
  }
  //res.send('hello') //trying to shut this thing up
  return false;
}

//CV stuff
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//Global Variables for CV
cv_start = 0
cv_dir = 1
cv_DAC2 = 2.5
cv = false
cycling = false
cv_set = 0
cv_dir = 1
cv_rate = 1000
cv_max = 1
cv_min = -1
cv_cycle = 1
cv_cycle_limit = 1
cv_step = 0 //where the potential at. 
cv_time  = new Date().getTime()	
cv_arr = []
last_comm = ""
cv_comm = ""
cv_settings = {}
cv_ocv_value = 0;
volts_per_tick = 5/1023 // approx value
cv_relative_to_ocv = false
cv_start_at_ocv = false
cv_resting = false
cv_rest_time = 0

//Global Variables for Logging
logger = "stopped"
datafile = ""
everyxlog = 1

cv_reading = '';

function readingLog() {
  return cv_reading;
};
  

// figure out ways to print all of this stuff so i know whats going on... dont really trust console.log though

function cv_start_go(value)
{
    //read in values and put them in the global variables. yay.
    test_running = true;
    
    console.log('cv_start_go called, yay');
		cv_arr = [] // ??
		cv_filename = value['file_name'];
		cv_foldername = value['folder_name'];
		if (value['cv_dir'] == 'charging') cv_dir = 1;
		if (value['cv_dir'] == 'discharging') cv_dir = -1;
		cv_rate =  (1/parseFloat(value['rate']))*1000*5	//convert mV/s to a wait time
		cv_max = parseFloat(value['max_potential'])
		cv_min = parseFloat(value['min_potential'])
		cv_cycle_limit = parseFloat(value['number_of_cycles']*2) //dan must of doubled 
		cv_cycle = parseInt(value['cv_cycle']);
		cv = false //if this is true - cv_stepper will run
		cv_time  = new Date().getTime()	
		//cv_step = cv_start
		cv_DAC2 = parseFloat(value['DAC2_value']);
    cv_raw_reading = ''
    cv_rest_time = value['rest_time']; //TODO: check that this is the right key.
    relative_to_ocv = value['relative_to_ocv']; //TODO make this so you can do it for either voltage.
    
    //flags for the starter
    if (value['start_at_ocv']) 
    { 
      cv_start_at_ocv = true
      cv_step = value['other_start_volt'];
    }
    if (value['relative_to_ocv']) cv_relative_to_ocv = true

    //start stuff
		l_starter(cv_foldername+'/'+cv_filename);

    //TODO: abstract reading
    //TODO: make this more robust
		cv_reading = 	last_ardu_reading
		//console.log(cv_reading);
		 //TODO: instead of do this in a node like way instead of a pythonic way
		//console.log("this is logging the cv_reading " + cv_reading);
		 //this will set volts_per_tick
		
		//move the ground and set ocv
		moveground(cv_DAC2);
		cv_resting = true;
		cv_rester();
		
		cv_start = parseFloat(value['cv_start'])
}

function cv_rester(){
  console.info("cv_rester");
  var time = new Date().getTime()
  if ((time - cv_time) >cv_rest_time)
    { 
      console.log('rest_time is over');
      //take a reading
		  cv_reading = last_ardu_reading
		  cv_ocv_value = cv_reading['working_potential']
		  
		  
		  //set final things
		  if (cv_start_at_ocv != true) cv_step = cv_ocv_value;
		  if (cv_relative_to_ocv) {
		    cv_max = cv_max + cv_ocv_value;
		    cv_min = cv_min + cv_ocv_value;
		  }
		  
		  //set the potential to the start and go for your life I guess.
		  console.log(cv_ocv_value);
		  console.log(cv_step);
		  potentiostat(cv_step)
		  
		  //set cv to on
		  cv = true;
		  cv_resting = false
  }
}

function cv_stepper()
{
	//console.log('stepped into cv');
	//console.log(cv_step);
	time = new Date().getTime()	
	if (time - cv_time > cv_rate)
	{
		console.log("next step")
		cv_time = time 
		cv_step = cv_step + cv_dir*.005
		if (cv_step > cv_max & cv_dir == 1)
		{
			cv_dir = -1
			cv_cycle++
		}
		
		else if (cv_step < cv_min & cv_dir == -1)
		{
			cv_dir = 1
			cv_cycle++
		}
		if (cv_cycle > cv_cycle_limit) 
		{
			cv = false
			test_finished()
		}
		else
		{
		  console.log("cv_step");
			console.log(cv_step)
			potentiostat(cv_step)
		}
	}
}
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Cycling Section
//==============================================================================================================
//Global Variablew for Arb Cyclingq

test_running = false;
arb_cycling = false
arb_cycling_settings = []
arb_cycling_step = 0
arb_cycling_step_start_time = 0
cycling_cycles = 0
cycling_cycle = 0
last_current = 0
last_potential = 0
total_pause_time = 0;
var pause_time;
var resume_time;

cyc_folder_name = ''
cyc_file_name = ''
ardustat_id = 25 //TODO: check that this isn't defined somewhere else, add in functionality for serial port
http_port = 8001



//cycling input looks as follows:
//[{"electro_function":"cycle"},{"cycles":4},{"cyc_mode":"galvanostatic","cyc_value":"1","time_cutoff":"10","voltage_cutoff":"0","current_cutoff":"0"},{"cyc_mode":"galvanostatic","cyc_value":"-1","time_cutoff":"15","voltage_cutoff":"0","current_cutoff":"0"},{"cyc_mode":"galvanostatic","cyc_value":"2","time_cutoff":"5","voltage_cutoff":"0","current_cutoff":"0"},{"cyc_mode":"galvanostatic","cyc_value":"-2","time_cutoff":"10","voltage_cutoff":"0","current_cutoff":"0"}] 
//TODO: clean up the input in the old cycler setup
//TODO: make the cycler table prettier and add some stuff that gives you units when either galvanostat, potentiostat selected




function cycling_start_go(value)
{
  test_running = true;
  console.log("this is cycling_start_go");
  total_pause_time = 0; 
  moveground(2.5)
  arb_cycling_settings = []
	arb_cycling_step = 0
	arb_cycling = false
	arb_cycling_step_start_time = new Date().getTime()
  for (var i = 2; i < value.length; i++) {// this is two because there is some bs stuff before it. like number of cycles etc..
    arb_cycling_settings.push(value[i])
  }
  cyc_folder_name = value[1].cyc_folder
  cyc_file_name = value[1].cyc_file_name
  cycling_cycles = value[1].cyc_cycles
  //TODO: add in stuff for ardustat_id, serial_port, http_port
  
  //start logging to csv
  l_starter(cyc_folder_name+'/'+cyc_file_name);
  
	console.log(arb_cycling_settings)

	arb_cycling = true
	cycling_mode()
	
}



//cycling stepper - if next step is ordered. call next_step().
// big issue - could be some niggles with the limits if next_step is called - should probably give some time to settle.
// so, if user requests skip_step - next_step called - timer for 2 a second is called - lets cell settle so no unecessary skipping occurs

// this needs to be made fancier i think
//TODO: add in capacity limit stuff?
function cycling_stepper()
{
	//console.log("cycling_stepper");
	time = new Date().getTime()
	this_set = arb_cycling_settings[arb_cycling_step]
	next_time = this_set['time_cutoff'] * 1000
	//console.log("next time is ")
	//console.log(next_time)
	
	if (this_set['cyc_value'] < 0) direction = 'discharge'
	else { direction = 'charge' }
	
	cutoff_potential = this_set['voltage_cutoff']
	cutoff_current = this_set['current_cutoff']

	way = 1
	if (direction == "discharge") way = -1
	
	this_time = time-arb_cycling_step_start_time
	//console.log(next_time - this_time)

	if (next_time != 0 & next_time < this_time) 
	{
	  console.log('time exceeded')
	 	next_step()
	}
  if (((skip_flag) & (time - skip_time > 1000)) || (!skip_flag)) // lets cell settle after skip step 
  {
    skip_flag = false;
	  if (this_set['cyc_mode'] == 'galvanostat') 
	  {
	    if (direction == "charge" & last_potential > cutoff_potential)
	    {
	      console.log('cutoff potential reached')
		    next_step()
	    }
	    else if (direction == "discharge" & last_potential < cutoff_potential)
	    {
	      console.log('cutoff potential reached')
		    next_step()
	    }
	  }
	  else if (this_set['cyc_mode'] == 'potentiostat')
	  {
	    if (Math.abs(last_current) < Math.abs(cutoff_current))
	    {
	      console.log('cutoff current reached');
	      next_step()
	    }
	  }
	}
}


// TODO: tidy things up - this can be done a little later though.
function next_step()
{
  console.log('next_step called');
  var quit = false
	console.log("NEXT!")
	arb_cycling_step++
	if (arb_cycling_step >= arb_cycling_settings.length) 
	{
	  arb_cycling_step = 0
	  if (cycling_cycle < cycling_cycles) cycling_cycle++
	  else
	  {
	    test_finished();
	    arb_cycling = false //stops going back into loop
	    quit = true
	  }
	}
	if (quit != true) cycling_mode() //if quit is true - then things will stop ( I hope )
	//TODO:add in the ability to pause and skip steps while cycling. 
}

function cycling_mode()
{
  console.log("cycling_mode");
	arb_cycling_step_start_time = new Date().getTime()
	this_set = arb_cycling_settings[arb_cycling_step]
	console.log(this_set)
	if (this_set['cyc_mode']=='potentiostatic')
	{
		potentiostat(parseFloat(this_set['cyc_value']))
		console.log("set potentiostat");
	}
	if (this_set['cyc_mode']=='galvanostatic')
	{
		if (this_set['value'] == 0) set_ocv()
		else galvanostat(parseFloat(this_set['cyc_value']))
		console.log("set galvanostat");
	}
	if (this_set['cyc_mode'] == 'rest')
	{
	  set_ocv()
	  console.log("set rest");
	}
}
//===================================================================================

//calibration section
//____________________________________________________________________________________
//CALIBRATION PORTION
//What happens
//1) We intitialize a counter, a loop counter,a loop limit and a callibration array
//2) When the function is called we flip the boolean and scan 
calibrate = false
counter = 0
calloop = 0
callimit = 2
calibration_array = []
rfixed = 10000

function calibrator(value)
{
	rfixed = parseFloat(value)
	//console.log(rfixed)
	calibrate = false
	counter = 0
	calloop = 0
	serialPort.write("R0255")
	setTimeout(function(){calibrate = true},100)
	console.log("this is the calibrator");
}

function calibrate_step()
{
		counter++;
		if (counter > 255)
		{
			counter = 0	
			calloop++
			if (calloop > callimit)
			{
				calibrate = false
				out_table = {}
				for (i = 0; i < calibration_array.length; i++)
				{
					this_foo = calibration_array[i]
					res_set = this_foo['res_set']
					dac_potential = this_foo['dac_potential']
					cell_potential = this_foo['cell_potential']
					gnd_potential = this_foo['gnd_potential']
					res_value = rfixed*(((dac_potential-gnd_potential)/(cell_potential-gnd_potential)) - 1)					
					if (out_table[res_set] == undefined) out_table[res_set] = []
					out_table[res_set].push(res_value)
				}
				//console.log(out_table)
				final_table = {}
				for (var key in out_table)
				{
					if (out_table.hasOwnProperty(key)) 
					{
						arr = out_table[key]
						sum = 0
						for (var i = 0; i < arr.length; i ++)
						{
							sum = sum + arr[i]
						}
						average = sum/(arr.length)
						final_table[key] = average
					}
				  
				}
				console.log(final_table)
				fs.writeFileSync("unit_"+id.toString()+".json",JSON.stringify(final_table))
				res_table = undefined;
			}
		} 
		setTimeout(function(){toArd("r",counter)},50);
}
//_____________________________________________________________________________________

//SETTING FUNCTIONS that abstracted electro stuff calls.


// could either hack like have done in python - or could try and do properly like node
function moveground(value)
{

	value_to_ardustat = value / volts_per_tick;
	//console.log("moveground");
	//console.log(value + " " + volts_per_tick);
	//console.log(value_to_ardustat);
	toArd("d",value_to_ardustat)
	toArd("-","0000");
}

//sets arudstat to open circuit potential
function set_ocv()
{
  l_writer('-0000');
}

function potentiostat(value)
{
	value_to_ardustat = value / volts_per_tick;
	toArd("p",value_to_ardustat)
}

//Set Galvanostat
//This stuff won't handle negative currents... 
//TODO: check if potentiostat handles negative curents.
function galvanostat(value)//TODO:go through and fix this.
{ 
  value = value/1000
	foovalue = Math.abs(value)
	//First Match R
	r_guess = 1/foovalue //used to be 0.1 changed cause thats what i did in python. 
	console.log('r_guess',r_guess)
	target = 1000000
	r_best = 0
	set_best = 0
	for (var key in res_table)
	{
		if (Math.abs(r_guess-res_table[key]) < target)
		{
			//console.log("got something better")
			console.log('key is ',key);
			target = Math.abs(r_guess-res_table[key]) 
			r_best = res_table[key]
			set_best = key
			
		}
	} 
	//console.log(res_table) //why is this undefined?

	//now solve for V
	delta_potential = Math.abs(value*r_best)
	console.log('r_best ', r_best);
	console.log('value ' , value);
	console.log('volts per tick ' , volts_per_tick)
	value_to_ardustat = delta_potential / volts_per_tick;
	//some hacks cause i'm tired as
	if (value_to_ardustat > 1023) {value_to_ardustat = 1023}
	if (value < 0) { value_to_ardustat = value_to_ardustat +2000 }
	
	console.log('value_to_ardustat ' , value_to_ardustat);
	console.log('set_best', set_best)
	console.log('value to ardustat ', value_to_ardustat)
	toArd("r",parseInt(set_best))
	toArd("g",parseInt(value_to_ardustat))
	
}





// for debugging only
function logstuff(req,res)
{
  try {
    console.log(req.body);
    res.send('hopefull this fixes things');
    console.log(req.body.electro_function);
    }
  catch (e) {
    console.log(e);
  }
}
var test = "test";


// makes the string good for sending to the ardustat
function ardupadder(command,number)
{
	number = parseInt(number)
	if (number < 0) number=Math.abs(number)+2000
	//console.log(number)
	padding = "";
	if (number < 10) padding = "000";
	else if (number < 100) padding= "00";
	else if (number < 1000) padding= "0";
	ard_out = command+padding+number.toString()
	return ard_out
	
}
//these are functions that can be called directly from the browser - setup to go through the router as well - almost irrelevant for now
//=================================================================================================================================================================================
//Write to serial port

writer = function(req,res){	
	if(kill==false) {	
		toSend = req.originalUrl.replace("/write/","")
		toSend = decodeURIComponent(toSend);
        //command = toSend;
//hack to make sure that CSV is turned on - only problem is that it might not know which file to write to - might be better than nothing - anyway i dont think that this is the problem.
        if ((toSend.indexOf("p") > -1) || (toSend.indexOf("g") > -1)) CSV_ON = true;
        command_list.push(toSend);
        //queue.push(toSend);
    		//serialPort.write(toSend);
		res.send(toSend);
	}
	else { res.send("killed :("); }
};


reader = function(req, res){
	if(kill==false) {
	    //console.log("this is from app.js");
	    console.log('buffer is ' +buf); //console.log doesn't actually work - I think that the function res.send gets called first which exits out of it. 
	    res.send(buf);
	}
	else { res.send("killed :("); }
};

starter = function(req,res) {
	var temp = req.originalUrl.replace("/startCSV/","")
	temp = decodeURIComponent(temp);
	count = 0;
	if(CSV_ON == false) {
	if(temp!="") { CSV_NAME = 'Data/' + temp +'.csv'; }

//stuff to create folder if not already there  
    var CSV_PARTS = CSV_NAME.split("/");
    for (var i = 0; i < CSV_PARTS.length-1; i++){
    CSV_FOLDER += CSV_PARTS[i] + "/";
}
    CSV_FOLDER = CSV_FOLDER.substring(0,CSV_FOLDER.length-1);
    console.log("CSV_folder "+CSV_FOLDER);
    mkdirp(CSV_FOLDER, function(err) { //TODO: make this recursive?? shoudl already be... but didnt work - oh well. 
});
//TODO: add Data folder to git ignore. 
	CSV_ON = true;
	res.send('CSV WRITING HAS BEGUN! Current output file: ' + CSV_NAME);
	console.log('writing data to: ' + CSV_NAME);
	}
	else {
	res.send('ALREADY WRITING TO FILE: ' + CSV_NAME);
	}
};
stopper = function(req,res) {
	if(CSV_ON == true) {
	CSV_NAME = 'Data/untitled.csv';
	res.send('CSV WRITING HAS BEEN MANUALLY STOPPED! Output file name reset to: ' + CSV_NAME);
	console.log('NOT writing to csv');
	CSV_ON = false;
	}
	else {
	res.send('WRITING ALREADY STOPPED!!!');
	}
};

name_setter = function(req,res) {
	var OLD_NAME = CSV_NAME;
	var temp = req.originalUrl.replace("/setName/","")
	CSV_NAME = 'Data/' + decodeURIComponent(temp)+'.csv'; //change here so that if there is a .csv then you don't attach this
	res.send('Original output file: \"' + OLD_NAME + '\" --> New output file: \"' + CSV_NAME + "\"");
	console.log('Original output file: \"' + OLD_NAME + '\" --> New output file: \"' + CSV_NAME + "\"");
};

//kill the interaction - used for both KILL and PAUSE
function pauser(req,res)
{
	test_running = true;
	kill = true;
	console.log('method control has been paused, and CSV writing has been paused');
	res.send('method control has been pause, and CSV writing has been pause');
	CSV_ON = false;
	pause_time = new Date().getTime()
}

function test_finished()
{
  console.log('test finished called');
  setTimeout(function(){set_ocv()},1000)
	console.log('method control has been stopped and CSV writing has been killed')
  test_running = false;
	kill = true;
	CSV_ON = false;
	io_emit('stop message', 'the test has stopped');
	//should also save the position. incase program crashes.
}


function killer(req,res) 
{
  console.log('killer called');
  test_finished()
	res.send('method control has been stopped, and CSV writing has been killed')
};

//resume control and forwarding to csv
function reviver(req,res,callback) 
{
	console.log('reviver called');
	res.send('reviver called');
	if (cv) { cv_time = new Date().getTime()	 }
  if (arb_cycling) { arb_cycling_step_start_time = new Date().getTime()	 }
  console.log('time set to start of step')
  l_writer(last_comm) //sets the command the same as before
  console.log('this is what we are reviving to ' + last_comm);
  resume_time = new Date().getTime()
  total_pause_time = total_pause_time + (resume_time - pause_time);
  console.log('total_pause_time');
  console.log(total_pause_time);
  callback()
};

function flag_resume()
{
  console.log('flag_resume called');
  kill = false;
  CSV_ON = true;
}
//skip a step of the cycler
var skip_time;
var skip_flag

function step_skip(req,res)
{
  console.log('step skip has been called')
  next_step()
  step_skip_time = new Date().getTime()
  skip_flag = true;
  res.send('step has been skipped')
}

//trying to show files that have been uploaded.
//try and show folders - then can click on folders to see files in them 
function analysis_display(req,res,indexer)
{
  console.log('analysis_display has been called');
	out = fs.readdirSync('Data/')
	console.log('the data is ' + out) ;
  lts = '<div id="folders" >'
  count_limit = 20;

  count = 0 
  for (var i in out)
  {	foo = out[i]
	  if (foo != "temper") lts += "<button id='"+foo+"'>"+foo+ "</button><br>";
	  count +=1
	  if (count > count_limit) break; 
  }
  lts += '</div>'
  indexer = indexer.replace("##_newthings_##",lts);
  res.send(indexer);
}

function file_display(req,res)
{
  console.log('file_display called');
  console.log(req.body.folder) 
  folder = req.body.folder
  out = fs.readdirSync('Data/'+folder)
  console.log('the files are ' + out);
  res.send(out)
  io_emit('console message','hey dan you can nap now');
}
//This is the thing that runs everything! 
//==========================================================
command_list = []
t2 = setInterval(function()
{
  command_list.push('s0000');
  if (calibrate) calibrate_step()
  if (cv_resting) cv_rester() //this is the resting phase at the start of a cv
  if ((cv) && (kill == false)) cv_stepper()
  if ((arb_cycling) && (kill == false)) cycling_stepper()
}, 100);

t1 = setInterval(function()
{
	if (command_list.length > 0)
	{
		sout = command_list.shift();
		if (sout != "s0000") console.log('sout is '+sout); //debugging print
		serialPort.write(sout);	
	}

},15)
//==========================================================
// export functionality
module.exports = {
  logstuff:logstuff,
  setstuff:setstuff,
  test:test,
  reader:reader,
  writer:writer,
  starter:starter,
  stopper:stopper,
  name_setter:name_setter,
  killer: killer,
  pauser: pauser,
  reviver:reviver,
  flag_resume:flag_resume,
  step_skip:step_skip,
  file_display:file_display,
  analysis_display:analysis_display,
  listen:listen,
  give_status:give_status
};


