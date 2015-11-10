var dgram = require('dgram');
var Struct = require('../../index.js');
 
var Person = Struct()
             .word32Sle('id')
             .chars('name', 16)
             .word32Sle('age')
             .floatle('weight')
             .doublele('height');

Person.allocate();

var server = dgram.createSocket("udp4");
server.on('message', function (msg, rinfo) {
    Person.setBuffer(msg);
	var proxy = Person.fields;
	var per = {};
	for(key in proxy){
		per[key] = proxy[key];
	}
    console.log(per);
    proxy.id = proxy.id + 1;
    proxy.age = proxy.age + 1;
    proxy.weight = proxy.weight + 2;
    proxy.height = proxy.height + 3;

    var buf = Person.buffer();
    server.send(buf, 0, buf.length, rinfo.port, rinfo.address);
});

server.on('listening', function () {
    console.log('listening....');
});

server.bind(8000, '127.0.0.1');
