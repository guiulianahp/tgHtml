
var express 	= require('express');
var app  		= require('express')();
var http 		= require('http').Server(app);
var io 			= require('socket.io')(http);

/* variables consulta BD*/
var puesto 					= [];
var estacionamiento 		= [];
var puestos 				= [];
var zona_id					= [];
var zona_estados			= [];
var zona_estacionamiento_id	= [];
var zona_descripcion		= [];
var zona_direccion  		= [];
var direcciones 			= [];
var direccioness 			= [];
var latitud 				= [];
var longitud 				= [];

var id 			= [];
var user_array	= [];
var path 		= require('path');
var oneDay 		= 86400000;

var pg 							= require('pg');
var conString 					= "postgres://user@localhost/SEI_VC";
var client 						= new pg.Client(conString);
var cliente 					= new pg.Client(conString);
var cliente_estacionamiento 	= new pg.Client(conString);
client.connect();
cliente.connect();
cliente_estacionamiento.connect();


// ------------------START BD------------------------------------------------
	
cliente.query("SELECT * FROM estacionamiento").on('row', function(row) {
	estacionamiento.push([row.id_estacionamiento,row.estado,row.descripcion,row.latitud,row.longitud]);
    daniel = 300;
    //console.log(estacionamiento);
    //console.log("SEP");
	
});

client.query("SELECT * FROM zona").on('row', function(row) {
		zona_id.push(row.id_zona);
		zona_estacionamiento_id.push(row.id_estacionamiento);
		zona_descripcion.push(row.descripcion);
		zona_estados.push(row.estado);


		client.query("SELECT * FROM direccion_zona WHERE id_zona ="+row.id_zona+"ORDER BY id_zona DESC").on('row', function(row) {
			direcciones.push([row.id_zona,row.longitud,row.latitud]);
			
		});

		client.query("SELECT * FROM puesto_estacionamiento WHERE id_zona ="+row.id_zona+"ORDER BY id_puesto DESC").on('row', function(row) {
			puestos.push([row.id_zona,row.estado,row.id_puesto]);
			
		});

	});



//------------------ START RENDER------------------------------------------
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.use(express.static(__dirname + '/views', { maxAge: oneDay }));
app.get('/', function(req, res){
	res.render('canvas');
	

});



// ------------------END BD------------------------------------------------       
	       

io.sockets.on('connection', function (socket) {
	
	
	
	console.log('usuario conectado');
	
	user_array.push(socket);
	socket.emit('info',{direcciones:direcciones, zona_estado:zona_estados, puesto_estado:puestos, id_zona: zona_id, estacionamiento:estacionamiento});
	
	
	var zona_id_aux 		= zona_id;
	var zona_estados_aux 	= zona_estados;
	var puestos_aux 		= puestos;
	var direcciones_aux 	= direcciones;
	var estacionamiento_aux = estacionamiento;

	client.query('LISTEN "watchers"');
		client.on('notification', function(data) {

		

			cadena	 = data.payload;
			id_zona	 = cadena.slice(5,10);
			for(i = 0; i<zona_id_aux.length; i++){
				if(zona_id_aux[i] == id_zona){
					zona_estados_aux[i]=parseInt(data.payload[4]);
				}
			}

		   socket.emit('info',{direcciones:direcciones_aux, zona_estado:zona_estados_aux, puesto_estado:puestos_aux, id_zona: zona_id_aux, estacionamiento:estacionamiento_aux});
			
		});

	cliente.query('LISTEN "puestos"');
		cliente.on('notification', function(data) {

			

			cadena	  = data.payload;
			id_puesto = cadena.slice(25,28);
			
			for(i = 0; i<puestos_aux.length; i++){

				if(puestos_aux[i][2] == id_puesto){
					puestos_aux[i][1]=parseInt(data.payload[22]);
				}
			}
		   
		   socket.emit('info',{direcciones:direcciones_aux, zona_estado:zona_estados_aux, puesto_estado:puestos_aux, id_zona: zona_id_aux, estacionamiento:estacionamiento_aux});
	
		});

	cliente_estacionamiento.query('LISTEN "estacionamiento"');
		cliente_estacionamiento.on('notification', function(data) {


			

			cadena	= data.payload;
			id_estacionamiento 			= data.payload[15];
			estado_estacionamiento 		= data.payload[16];
			estacionamiento_descripcion = cadena.slice(17,35);
			estacionamiento_latitud 	= cadena.slice(42,49);
			estacionamiento_longitud	= cadena.slice(43,59);
			

			for(i = 0; i<estacionamiento_aux.length; i++){
				
				if(estacionamiento_aux[i][0] == id_estacionamiento){
					estacionamiento_aux[i][1]=parseInt(data.payload[16]);
				}
			}

			socket.emit('info',{direcciones:direcciones_aux, zona_estado:zona_estados_aux, puesto_estado:puestos_aux, id_zona: zona_id_aux, estacionamiento:estacionamiento_aux});
	
			
		});

	

	socket.on('disconnect', function(){
    	var socketIndex = user_array.indexOf(socket);
    	console.log('socket = ' + socketIndex + ' disconnected');
	    if (socketIndex >= 0) {
	      user_array.splice(socketIndex, 1);
	    }
  	});

	
});



        
http.listen(3000,"0.0.0.0");

