from pithy import *
import numpy as np

cwd = os.getcwd()
base_dir = '../../'+cwd.split('/')[-2]+'/Data/'
x = 't'
y = 'v'
file_name = base_dir + 'cyc/t1'


file_name = file_name + '_clean.csv'
data = open(file_name).read().split('\n')
data = np.array(data)
time_list = data[0][1:-1].split(',')
voltage_list = data[1][1:-1].split(',')
current_list = data[2][1:-1].split(',')
if len(data) > 3:
    cycle_list = data[3][1:-1].split(',')

plot(time_list,voltage_list)
xlabel('time (s)')
ylabel('votlage (V)')
showme()
clf()

plot(time_list,current_list)
xlabel('time (s)')
ylabel('current (mA)')
showme()
clf()

plot(voltage_list, current_list)
xlabel('votlage (V)')
ylabel('current (mA)')
showme()
clf()

