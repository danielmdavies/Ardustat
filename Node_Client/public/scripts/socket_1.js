var socket = io();
$('form').submit(function(){
  socket.emit('chat message', $('#m').val());
  $('#m').val('');
  return false;
});
socket.on('console message', function(msg){
  console.log(msg)
});
socket.on('stop message', function(msg){
  console.log('stop message called')
  showReturnButton()
});
