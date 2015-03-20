from pithy import *
from ardustat_class_0820 import Communication as Node
from time import sleep
import time
import numpy
import pickle
import json
cwd = os.getcwd()
local_resistance = True #this will always be true unless you are part of the Steingart lab
state = {}

#change things from here
folder_name = "pickler"
file_name = "test1"
base_dir = "../../" + cwd.split('/')[-2]+"/"
home_data = base_dir+"Data/"
hostsite = 'http://localhost:9001/'
n = Node(hostsite)
print home_data

file_name = folder_name + "/" + file_name
directory = home_data+folder_name
if not os.path.exists(directory):
    os.makedirs(directory)
if ".csv" in file_name:
    file_name = file_name.replace('.csv', '')
setup_file = home_data+file_name+"_setup.txt"
pickle_dump = home_data+file_name+".p"


#try and load pickle file and then set parameters
try:
    state = pickle.load(open(pickle_dump))

    cycler_dict_cc_charge = state['cycler_dict_cc_charge']
    cycler_dict_cc_discharge = state['cycler_dict_cc_discharge']
    cycler_dict_hold_volt_max = state['cycler_dict_hold_volt_max']
    cycler_dict_hold_volt_min = state['cycler_dict_hold_volt_min']
    
    order = state['order']
    ardustat_id = state['ardustat_id']
    notes = state['notes']
    ardustat_id = state['ardustat_id']
    read_delay = state['read_delay']
    start_rest_time = state['start_rest_time']
    DAC2_value = state['DAC2_value']
    
    current_state = state['current_state']
    cycles = state['cycles']
    cycle = state['cycle']
    print "loaded from file: ",pickle_dump
    print "this experiment will continue from the following state: ", state
    
    
#if can't load pickle file - set parameters manually
except Exception, e:
    print "this is the first time this experiment has been called"
    print "or this went wrong ", e
    ardustat_id = 25
    read_delay = 1
    notes = ''
    start_rest_time = 10
    DAC2_value = 2.5
    cycles = 5
    order = ['rest1 5','charge','hold_voltage_max','rest2 5','discharge']
    current_state = order[0]
    cycle = 0
    #specifications for constant current portions of cycle
    cycler_dict_cc_charge = {"file_name":file_name, 
    "ardustat_id":ardustat_id,
    #"DAC2_value":DAC2_value, #recommended low
    "charge_current":0.0036,
    "max_voltage_limit":'na',
    "capacity_limit":'na',
    "time_limit":5,
    'read_delay':read_delay}
    
    cycler_dict_cc_discharge = {"file_name":file_name, 
    "ardustat_id":ardustat_id,
    #"DAC2_value":DAC2_value, #recommended to be high
    "discharge_current":-0.0036,
    "min_voltage_limit":'na',
    "capacity_limit":'na',
    "time_limit":5,
    "read_delay":read_delay}
    
    #specifications for constant voltage portions of cycle
    cycler_dict_hold_volt_max = {"file_name":file_name, 
    "ardustat_id":ardustat_id,
    "cycles":0, #why do i have this here?
    #"DAC2_value":DAC2_value, #recommended to be low
    "current_limit_at_max_voltage":'na',
    "max_voltage_limit":1,
    "time_limit_at_max":10,
    "read_delay":read_delay}
    
    cycler_dict_hold_volt_min = {"file_name":file_name, 
    "ardustat_id":ardustat_id,
    "cycles":0,
    #"DAC2_value":DAC2_value, #recommended to be high
    "current_limit_at_min_voltage":'na',
    "min_voltage_limit":0,
    "time_limit_at_min":5,
    "read_delay":read_delay}
    

def load_resistance_table(ardustat_id):
    if local_resistance:
        res_table = pickle.load(open(base_dir + "resistance_tables/resistance_table_" + str(ardustat_id) + ".p"))
    else:
        res_table = pickle.load(open(drop_pre + 'actual_resistance_tables/resistance_table_'+str(ardustat_id)+',p'))
    return res_table
res_table = load_resistance_table(cycler_dict_hold_volt_min["ardustat_id"])

#send set-up stuff to the "setup file" or "pickle file"
dictionary_of_things = {
    "cycler_dict_cc_charge" :cycler_dict_cc_charge,
    "cycler_dict_cc_discharge" : cycler_dict_cc_discharge,
    "cycler_dict_hold_volt_max" : cycler_dict_hold_volt_max,
    "cycler_dict_hold_volt_min" : cycler_dict_hold_volt_min,
    "file_name" : file_name,
    "ardustat_id" :ardustat_id,
    "notes": notes,
    "start_rest_time":start_rest_time,
    "read_delay":read_delay,
    "DAC2_value":DAC2_value,
    
    "ardustat_id":ardustat_id,
    "cycles":cycles,
    "current_state": current_state,
    "cycle": cycle,
    "order":order
    }



with open(setup_file, 'w') as outfile:
    json.dump(dictionary_of_things, outfile)
pickle.dump(dictionary_of_things, open(pickle_dump,'wb'))

#print a read for confirmation of communication
print n.sread()

#cycle control functions
#selects which function to call
def selector(selection,cycle):
    if selection == "charge":
        n.constant_current_charge(cycler_dict_cc_charge,cycle,res_table)
    elif selection == 'discharge':
        n.constant_current_discharge(cycler_dict_cc_discharge,cycle,res_table)
    elif selection == 'hold_voltage_max':
        n.hold_voltage_max(cycler_dict_hold_volt_max,cycle,res_table)
    elif selection == 'hold_voltage_min':
        n.hold_voltage_min(cycler_dict_hold_volt_min,cycle,res_table)
    elif 'rest' in selection:
        n.ocv()
        sleep(int(selection[5:]))

def cycle_control(state):
    first_time = True
    print "starting cycle control"
    n.set_DAC2(DAC2_value)
    sleep(1)
    n.ocv()
    
    if (state == {}):
        sleep(start_rest_time)
        cycle = 0
    else:
        cycle = state['cycle']
        sleep(1)
    while cycle<cycles:
        #current state changed - save it
        dictionary_of_things.update({'cycle':cycle})
        pickle.dump(dictionary_of_things, open(pickle_dump,'w'))
        if ((state != {}) & (first_time==True)):
            i = order.index(current_state)
            print "i is %s and current_state is %s)" %(i,current_state)
            first_time = False
        else:
            i = 0
        #this is pretty much the only important line
        while i < len(order):
            print "completing task ", order[i]
            selector(order[i],cycle)
            #current state updated
            dictionary_of_things.update({"current_state":order[i]})
            pickle.dump(dictionary_of_things, open(pickle_dump,'w'))
            i +=  1
        cycle += 1
        dictionary_of_things.update({"cycle":cycle})
        pickle.dump(dictionary_of_things, open(pickle_dump, 'w'))
    n.ocv()
    print "donezo"
            
#run the stuff - if pickle file - run from where pickle file loaded stuff
n.startCSV(file_name)
sleep(.1)
n.sread()
sleep(.1)
cycle_control(state)
print n.stopCSV()
#if not - run from start
