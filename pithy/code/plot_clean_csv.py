#!/usr/bin/python

import pickle
from pithy import *
import json

cwd = os.getcwd()

ardustat_id = '1001'
#base_file = '../../Ardustat_Private/'
base_file = '../../'+cwd.split('/')[-2]+'/'
downloads_file = '/Users/danny/Downloads/cv/'
#file name stuff
#--------------------------------------------------------------------------------
#automagically change  to the directory of where  node files are.
#file_name= base_file +'/Data/' + 'greg/limno2'
file_name = downloads_file + 'Sean11_clean.csv'

if '_clean.csv' not in file_name:
    file_name.replace('.csv','_clean.csv')

print file_name
data = open(file_name).read().split('\n')
data = np.array(data)
time_list = data[0][1:-1].split(',')
voltage_list = data[1][1:-1].split(',')
current_list = data[2][1:-1].split(',')
if len(data) > 3:
    cycle_list = data[3][1:-1].split(',')
    
#print voltage_list

plot (voltage_list,current_list,'.')
#xlim(.65,.8)
xlabel("voltage (V)")
ylabel("current (A)")
showme()
clf()

plot (time_list, voltage_list,'.')
xlabel("time (s)")
ylabel("voltage (V)")
showme()
clf()

plot (time_list, current_list,'.')
xlabel("time")
ylabel("current A")
showme()
clf()