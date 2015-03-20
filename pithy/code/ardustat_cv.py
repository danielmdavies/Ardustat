from pithy import *
from ardustat_class_0820 import Communication as Node
from time import sleep
import time
import numpy
import pickle
import json
import os
cwd = os.getcwd()
hostsite = 'http://localhost:9001/'
n = Node(hostsite)
base_dir = "../../" + cwd.split('/')[-2]+"/"
home_data = base_dir + "Data/"

folder_name = "debug_stuff"
file_name = "resistor_2"
ardustat_id = 1001
local_resistance = True #unless you are part of the steingart lab - this will always be true. 
notes = 'These are notes: resistor 1023_debug - 50ms reading, read_timing = 200ms, firmware: firmware_dd_1023, counto = 5, weptcounter = 100,'

start_rest_time = 10
rate = .2 #mv/s
cycles = 3
min_potential = .4
max_potential = 1.8
read_delay = 0
DAC2_value = 2.5
relative_to_ocv = False
#_______________________________________________________________________________

#some hacky file stuff
file_name = folder_name + "/" + file_name
directory = base_dir+folder_name
if not os.path.exists(directory):
    os.makedirs(directory)
if ".csv" in file_name:
    file_name = file_name.replace('.csv', '')
setup_file = base_dir+file_name+"_setup.txt"

#control functions
def load_resistance_table(ardustat_id):
    if local_resistance:
        res_table = pickle.load(open(base_dir + "resistance_tables/resistance_table_" + str(ardustat_id) + ".p"))
    else:
        res_table = pickle.load(open(drop_pre + 'actual_resistance+tables/resistance_table_'+str(ardustat_id)+',p'))
    return res_table

print n.sread()
res_table = load_resistance_table(ardustat_id)

def cyclic_voltammetry(dictionary_of_things):
    d = dictionary_of_things
    start_rest_time = d["start_rest_time"]
    rate = d["rate"]
    cycles = d["cycles"]
    min_potential = d["min_potential"]
    max_potential = d["max_potential"]
    read_delay = d["read_delay"]
    DAC2_value = d["DAC2_value"]
    relative_to_ocv = d["relative_to_ocv"]
    
    cycle = 0
    n.set_DAC2(DAC2_value)
    sleep(2)
    n.ocv()
    time.sleep(start_rest_time)
    print n.startCSV(file_name)
    time_start = time.time()
    
    read = n.parsedread(res_table) 
    ocv = read['adc-ref_adc']
    output = ocv
    print "adc-ref_adc",output
    print "dac2: %r" %read['dac2']
    if relative_to_ocv:
        min_potential = min_potential + output #V
        max_potential = max_potential + output #V
    print "max_potential ", max_potential
    print "min_potential ", min_potential
#---------------------------------------------------------------------------#
    while cycle < cycles:
        output = charge(output, rate, max_potential)
        output = discharge(output, rate, min_potential)
        cycle += 1
    output = discharge(output, rate, ocv)
    n.ocv()
#---------------------------------------------------------------------------#
   	        
def charge(output, rate, high_v):
    while output < high_v:
        print "attempt potential: %r" %output
        step_time = time.time()
        voltage = n.potentiostat(output)
        output = output + .005
        while ((time.time()-step_time) < (5/rate)):
            pass
    output = high_v
    return output

def discharge(output, rate, low_v):
    while output > low_v:
        print "attempt potential: %r" %output
        step_time = time.time()
        voltage = n.potentiostat(output)
        output = output - .005
        while (time.time()-step_time) < (5/(rate)):
            pass
    output = low_v
    return output

#setup file stuff
dictionary_of_things = {
    "ardustat_id" : ardustat_id,
    "notes" : notes,
    "start_rest_time" : start_rest_time,
    "rate" : rate,
    "cycles" : cycles,
    "min_potential" : min_potential,
    "max_potential" : max_potential,
    "read_delay" : read_delay,
    "DAC2_value" : DAC2_value,
    "relative_to_ocv" : relative_to_ocv
    }
with open(setup_file, 'w') as outfile:
    json.dump(dictionary_of_things, outfile)

#run the thing
print n.changefile(file_name)
sleep(.05)
n.swrite('-0000')
sleep(.05)
sleep(1)
cyclic_voltammetry(dictionary_of_things)
print n.stopCSV()