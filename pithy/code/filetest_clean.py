from pithy import *
#import pandas as pd
import numpy as np
#import pandas as pd

cwd = os.getcwd()
base_dir = '../../'+cwd.split('/')[-2]+'/Data/'
x = 't'
y = 'v'

try:
    if len(sys.argv) > 1:
        file_name = base_dir + sys.argv[1] + "/"
    if len(sys.argv) > 2:
        file_name = file_name + sys.argv[2]
    if len(sys.argv) >3:
        x = sys.argv[3]
    if len(sys.argv) >4:
        y = sys.argv[4]
    
    data = open(file_name).read().split('\n')
    data = np.array(data)
    time_list = data[0][1:-1].split(',')
    voltage_list = data[1][1:-1].split(',')
    current_list = data[2][1:-1].split(',')
    if len(data) > 3:
        cycle_list = data[3][1:-1].split(',')
    
    if (x == 'v'):
            xaxis = voltage_list
            xlegend = "voltage (V)"
    elif (x == 'c'):
        xaxis = current_list
        xlegend = "current (A)"
    else:
        xaxis = time_list
        xlegend = "time (s)"
    if (y == 'c'):
        yaxis = current_list
        ylegend = "current (A)"
    else:
        yaxis = voltage_list
        ylegend = "voltage (V)"
    plot(xaxis,yaxis)
    dpi = 80
    xlabel(xlegend)
    ylabel(ylegend)
    tip = ".png"
    imagesource = 'images/pithy_img_'+str(int(time.time()*1000))+tip
    w = ""
    h = ""
    s = "style='%s%s'" %(w,h)
    savefig(imagesource,dpi=dpi)
    image = '<img '+s+' src=/'+imagesource+'>'
    print imagesource
except Exception, e:
    print "error ", e