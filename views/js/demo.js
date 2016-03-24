///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

meSpeak.loadConfig("mespeak_config.json");
meSpeak.loadVoice("voices/es.json");
  
function loadVoice(id) {
  var fname="voices/"+id+".json";
  meSpeak.loadVoice(fname, voiceLoaded);
}
  
function voiceLoaded(success, message) {
  if (success) {
    alert("Voice loaded: "+message+".");
  }
  else {
    alert("Failed to load a voice: "+message);
  }
}
    
/*
  auto-speak glue:
  additional functions for generating a link and parsing any url-params provided for auto-speak
*/
    
var formFields = ['text','amplitude','wordgap','pitch','speed'];
    
function autoSpeak() {
	// checks url for speech params, sets and plays them, if found.
    // also adds eventListeners to update a link with those params using current values
    var i,l,n,params,pairs,pair,
    	speakNow=null,
        useDefaultVoice=true,
        q=document.location.search,
        f=document.getElementById('speakData'),
        s1=document.getElementById('variantSelect'),
        s2=document.getElementById('voiceSelect');

    if (!f || !s2) return; // form and/or select not found

    if (q.length>1) {
	  	// parse url-params
	    params={};
	    pairs=q.substring(1).split('&');

	    for (i=0, l=pairs.length; i<l; i++) {
	      pair=pairs[i].split('=');
	      if (pair.length==2) params[pair[0]]=decodeURIComponent(pair[1]);
	    }

	    // insert params into the form or complete them from defaults in form
	    for (i=0, l=formFields.length; i<l; i++) {
	      n=formFields[i];
	      if (params[n]) {
	        f.elements[n].value=params[n];
	      }
	      else {
	        params[n]=f.elements[n].value;
	      }
	    }

	    if (params.variant) {
	      for (i=0, l=s1.options.length; i<l; i++) {
	      	if (s1.options[i].value==params.variant) {
	      	  s1.selectedIndex=i;
	      	  break;
	      	}
	      }
	    }
	    else {
	      params.variant='';
	    }

	    // compile a function to speak with given params for later use
	    // play only, if param "auto" is set to "true" or "1"
	    if (params.auto=='true' || params.auto=='1') {
	      speakNow = function() {
	        meSpeak.speak(params.text, {
	          amplitude: params.amplitude,
	          wordgap: params.wordgap,
	          pitch: params.pitch,
	          speed: params.speed,
	          variant: params.variant
	        });
	      };
	    }

	    // check for any voice specified by the params (other than the default)
	    if (params.voice && params.voice!=s2.options[s2.selectedIndex].value) {
	      // search selected voice in selector
	      for (i=0, l=s2.options.length; i<l; i++) {
	        if (s2.options[i].value==params.voice) {
	          // voice found: adjust the form, load voice-data and provide a callback to speak
	          s2.selectedIndex=i;
	          meSpeak.loadVoice('voices/'+params.voice+'.json', function(success, message) {
	            if (success) {
	              if (speakNow) speakNow();
	            }
	            else {
	              if (window.console) console.log('Failed to load requested voice: '+message);
	            }
	          });
	          useDefaultVoice=false;
	          break;
	        }
	      }
	    }

	    // standard voice: speak (deferred until config is loaded)
	    if (speakNow && useDefaultVoice) speakNow();
    }

    // initial url-processing done, add eventListeners for updating the link
    for (i=0, l=formFields.length; i<l; i++) {
    	f.elements[formFields[i]].addEventListener('change', updateSpeakLink, false);
    }

    s1.addEventListener('change', updateSpeakLink, false);
    s2.addEventListener('change', updateSpeakLink, false);

    // finally, inject a link with current values into the page
    updateSpeakLink();
}
    
function updateSpeakLink() {
	// injects a link for auto-execution using current values into the page
  	var i,l,n,f,s,v,url,el,params=new Array();

  	// collect values from form
  	f=document.getElementById('speakData');

    for (i=0, l=formFields.length; i<l; i++) {
    	n=formFields[i];
        params.push(n+'='+encodeURIComponent(f.elements[n].value));
    }

    // get variant
    s=document.getElementById('variantSelect');

    if (s.selectedIndex>=0) params.push('variant='+s.options[s.selectedIndex].value);
  
    // get current voice, default to 'en/en' as a last resort
    s=document.getElementById('voiceSelect');
  
    if (s.selectedIndex>=0) v=s.options[s.selectedIndex].value;

    if (!v) v=meSpeak.getDefaultVoice() || 'en/en';
    
    params.push('voice='+encodeURIComponent(v));
    params.push('auto=true');
  
    // assemble the url and add it as GET-link to the page
    url='?'+params.join('&');
    url=url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');

    el=document.getElementById('linkdisplay');

    if (el) el.innerHTML='Instant Link: <a href="'+url+'">Speak this</a>.';
}
    

// trigger auto-speak at DOMContentLoaded
if (document.addEventListener) document.addEventListener( "DOMContentLoaded", autoSpeak, false );


/****************************************************************************************************************************************************************/
/*                                                                   SCRIPT GOOGLE MAPS                                                                         */
/****************************************************************************************************************************************************************/
var map;
var coordenadas_aux = [];
var zoom;
var estado_estacionamiento;
var zona;
var cantidad_zonas = [];
var puestos 	   = [];
var marcadores     = [];
var marcadores_aux = [];
var aux 		   = 0;
var ubicacion_inicial;
var geo_options    = {
		enableHighAccuracy: true, 
		maximumAge        : 30000, 
		timeout           : 27000
};


function sonido(){

	var cadena= 'Los estacionamietos disponibles son: ';
	for (var i = 0; i < estado_estacionamiento.length; i++){
		
		if (estado_estacionamiento[i][1] ==0){
		cadena = cadena + estado_estacionamiento[i][2] +'. ';}
		/*else{
		cadena = cadena + estado_estacionamiento[i][2]+' Sin puestos Disponibles. ';}*/
	}

	meSpeak.speak(cadena, { amplitude: 100, wordgap: 0, pitch: 50, speed: 175 });
	cadena = '';
}

function obtener_centro(position){
    var infogps = new google.maps.InfoWindow({
  						maxWidth: 160
	});	
	
	ubicacion_inicial = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
	
	if (aux==0){
		var marker 	   = new google.maps.Marker({ position: ubicacion_inicial, map:map, title:'Tu ubicacion',icon: '/image/gps.png', draggable:true});
		google.maps.event.addListener(marker, 'click', function() {
			infogps.setContent('Tu ubicacion');
		    infogps.open(map,marker);
		  });
		aux = 1;
	}
}

function locError(error) {
	alert("Alerta de GPS No se pudo obtener ubicacion, problemas con el gps");
}

function toRad(x) {return x*Math.PI/180;}
		
function calculo_distancia(a,b){
	var lat1 = a.lat();
	var lat2 = b.lat();
	var lon1 = a.lng();
	var lon2 = b.lng();
	var R = 6371; // km
	var dLat = toRad(lat2-lat1);
	var dLon = toRad(lon2-lon1);
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
			Math.sin(dLon/2) * Math.sin(dLon/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	var d = R * c;   
	return(d*1000);		
}
		
function crear_zona(coordenada, cantidad_puestos,zona_estado,cantidad_zonas,estacionamiento,zonas,puestos_e){
	zoom= map.getZoom();
	var coordenadas 	= [];
	var infowindow = new google.maps.InfoWindow({
		maxWidth: 160
    	});

	if (zoom <=16){
		
		var suma = 0;
		if(cantidad_zonas.length!=0){
			for (var i = 0; i < cantidad_zonas.length; i++) {
				cantidad_zonas[i].setMap(null);
			}
		}

		if(marcadores.length!=0){
			for (var i = 0; i < marcadores.length; i++) {
				marcadores[i].setMap(null);					
			}
			marcadores_aux  = [];
		}

		if(puestos.length!=0){
			for (var i = 0; i < puestos.length; i++) {
				puestos[i].setMap(null);
		  	}
		  	puestos = [];
		}

	    for(var a = 0; a < estacionamiento.length; a++){
	    	suma = suma + estacionamiento[a][1];
			}

		if (suma == 0){
			var fullColor 	= '#009900';
		}

		if (suma == estacionamiento.length){
			var fullColor 	= '#009900';
		}

		if ((estacionamiento.length-suma) ==1 & (suma != 0)){
			var fullColor 	= '#ffff66';
		}
		
		suma=0;	  	
		var triangleCoords = [
		    new google.maps.LatLng(8.297352, -62.712321),
		    new google.maps.LatLng(8.298149, -62.710412),
		    new google.maps.LatLng(8.297098, -62.709993),
		    new google.maps.LatLng(8.295739, -62.711656),
		    new google.maps.LatLng(8.297352, -62.712321)
		  ];

		var zona = new google.maps.Polygon({
		    paths: triangleCoords,
		    strokeOpacity: 0.8,
		    strokeWeight: 2,
		    fillColor: fullColor,
		    fillOpacity: 0.35
		});

		zona.setMap(map);
	    cantidad_zonas.push(zona);				    			
	}
		
	if (zoom <=18 & zoom>16){
		var sum_z = 0;
		var contador = 0;
		var arre_suma = [];

		for(var i = 0; i< zonas.length; i++){
			for(var j = 0; j<puestos_e.length; j++){
				if(puestos_e[j][0] == zonas[i]){
						sum_z = sum_z + puestos_e[j][1];
						contador = contador+1;
	    			}
			}
			arre_suma.push([sum_z,contador]);
	    	sum_z = 0;
	    	contador = 0;
		}

		if(cantidad_zonas.length!=0){
			for (var i = 0; i < cantidad_zonas.length; i++) {
				cantidad_zonas[i].setMap(null);
			}
		}

		if(marcadores.length!=0){
			for (var i = 0; i < marcadores.length; i++) {
				marcadores[i].setMap(null);					
			}
			marcadores_aux  = [];
		}
	
		if(puestos.length!=0){
			for (var i = 0; i < puestos.length; i++) {
				puestos[i].setMap(null);
		  	}
		  	puestos = [];
		}
		
	    for(var a = 0; a < estacionamiento.length; a++){
			for(var i = 0; i < coordenada.length; i++){
				for(var j = 0; j < coordenada[i].length; j++){
					coordenadas.push(new google.maps.LatLng(coordenada[i][j][0], coordenada[i][j][1]));
				}

				if (zona_estado[i] == 1){
					var fullColor 	= '#FF0000';
					
				}
			  	if (zona_estado[i] == 0){
					var fullColor 	= '#009900';
					
			    }

			    if ((arre_suma[i][1]-arre_suma[i][0])==1){
					var fullColor 	= '#ffff66';
				}

			    var zona = new google.maps.Polygon({
				    paths: coordenadas,
				    strokeOpacity: 0.8,
				    strokeWeight: 2,
				    fillColor: fullColor,
				    fillOpacity: 0.35
			  	});

				zona.setMap(map);
			    cantidad_zonas.push(zona);				    
				coordenadas =[];

					//var marker = new google.maps.Marker({ position: new google.maps.LatLng(8.297578, -62.711088), map:map,icon: pinImage});			
			}
		}

		for(var a =0; a < estacionamiento.length; a++){

			if (estacionamiento[a][1] == 1){
				var pinColor 	= "FF0000"; 
			    anuncio = estacionamiento[a][2]+' Sin puestos disponibles'; 
			}
			if (estacionamiento[a][1] == 0){
				var pinColor 	= "009900";
			  	anuncio = estacionamiento[a][2]+' Con puestos disponibles'; 
			}

			var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + pinColor,new google.maps.Size(21, 34),new google.maps.Point(0,0),new google.maps.Point(10, 34));

			var marker = new google.maps.Marker({ position: new google.maps.LatLng(estacionamiento[a][3], estacionamiento[a][4]), map:map,icon: pinImage});

			marcadores.push(marker);
			marcadores_aux.push(anuncio);
							
			google.maps.event.addListener(marker, 'click', (function(marker, a) {
				return function() {
					infowindow.setContent(marcadores_aux[a]);
					infowindow.open(map, marker);
				}
			})(marker, a));
		}
	}

	if (zoom>18){

		var sum_z = 0;
		var contador = 0;
		var arre_suma = [];

		for(var i = 0; i< zonas.length; i++){
			for(var j = 0; j<puestos_e.length; j++){
				if(puestos_e[j][0] == zonas[i]){
						sum_z = sum_z + puestos_e[j][1];
						contador = contador+1;
	    			}
			}
			arre_suma.push([sum_z,contador]);
	    	sum_z = 0;
	    	contador = 0;
		}

		if(cantidad_zonas.length!=0){
			for (var i = 0; i < cantidad_zonas.length; i++) {
				cantidad_zonas[i].setMap(null);
			}
		}

		if(marcadores.length!=0){
			for (var i = 0; i < marcadores.length; i++) {
				marcadores[i].setMap(null);					
			}
			marcadores_aux  = [];

		}
	
		if(puestos.length!=0){
			for (var i = 0; i < puestos.length; i++) {
				puestos[i].setMap(null);
		  	}
		  	puestos = [];
		}

	    for(var a = 0; a < estacionamiento.length; a++){
			for(var i = 0; i < coordenada.length; i++){

				for(var j = 0; j < coordenada[i].length; j++){
					coordenadas.push(new google.maps.LatLng(coordenada[i][j][0], coordenada[i][j][1]));
				}

				
				if (zona_estado[i] == 1){
					var fullColor 	= '#FF0000';
					
				}
			  	if (zona_estado[i] == 0){
					var fullColor 	= '#009900';
					
			    }

			    if ((arre_suma[i][1]-arre_suma[i][0])==1){
					var fullColor 	= '#ffff66';
				}

			    if (estacionamiento[a][1] == 1){
			    	var pinColor 	= "FF0000"; 
					anuncio = estacionamiento[a][2]+' Sin puestos disponibles'; 
				}
			  	if (estacionamiento[a][1] == 0){
			  		var pinColor 	= "009900";
					anuncio = estacionamiento[a][2]+' Con puestos disponibles'; 
			    }

			    var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + pinColor,new google.maps.Size(21, 34),new google.maps.Point(0,0),new google.maps.Point(10, 34));

			    var zona = new google.maps.Polygon({
			    paths: coordenadas,
			    strokeOpacity: 0.8,
			    strokeWeight: 2,
			    fillColor: fullColor,
			    fillOpacity: 0.35
			  	});

				zona.setMap(map);
			    cantidad_zonas.push(zona);	
			    var fullColor = '';
					var latitud_origen  = ((coordenadas[1].lat()-coordenadas[0].lat())/2)+coordenadas[0].lat();
					var longitud_origen = ((coordenadas[1].lng()-coordenadas[0].lng())/2)+coordenadas[0].lng();
					var origen = new google.maps.LatLng(latitud_origen,longitud_origen);

					var latitud_final  = ((coordenadas[3].lat()-coordenadas[2].lat())/2)+coordenadas[2].lat();
					var longitud_final = ((coordenadas[3].lng()-coordenadas[2].lng())/2)+coordenadas[2].lng();
					var destino = new google.maps.LatLng(latitud_final,longitud_final);
						  
					var distancia_total = calculo_distancia(origen, destino);
					var distancia_horizontal = (longitud_final - longitud_origen)/(cantidad_puestos[i].length+1);
						  
					var radio = (((distancia_total*(cantidad_puestos[i].length/(cantidad_puestos[i].length+1)))/cantidad_puestos[i].length+1)/2)*0.85;
					var latitud_aux = latitud_origen;
					var longitud_aux = longitud_origen;
					  
					for(var z = 0 ; z < cantidad_puestos[i].length ; z++){
						  	if (cantidad_puestos[i][z] == 1){
						  		var fullColor = '#FF0000'; 
						  	}
							if (cantidad_puestos[i][z] == 0){
								var fullColor = '#009900'; 
							}

							longitud_aux = longitud_aux + distancia_horizontal;
							latitud_aux =  ((latitud_final-latitud_origen)*((longitud_aux-longitud_origen)/(longitud_final-longitud_origen)))+latitud_origen;
							var origen = new google.maps.LatLng(latitud_aux,longitud_aux);
							var opcion_puesto = {
								fillColor: fullColor,
								fillOpacity: 0.85,
								map: map,
								center: origen,
								radius: 2,
								draggable:true
							};
							var puesto = new google.maps.Circle(opcion_puesto);
							puestos.push(puesto);

								//var marker = new google.maps.Marker({ position: new google.maps.LatLng(8.297578, -62.711088), map:map,icon: pinImage});
							/*var marker = new google.maps.Marker({ position: new google.maps.LatLng(8.295906, -62.711584), map:map,icon: pinImage});

							marcadores.push(marker);
							marcadores_aux.push(anuncio);
							
							
								//EVENTO DE LOS MARCADORES
							google.maps.event.addListener(marker, 'click', (function(marker, a) {
								        return function() {
								          infowindow.setContent(marcadores_aux[a]);
								          infowindow.open(map, marker);
								        }
				      			})(marker, i));*/
							}
									    
				coordenadas =[];
			}
		}
	}

	google.maps.event.addListener(map, 'zoom_changed', function() {
	    zoom= map.getZoom();

	    if (zoom <=16){	
			var suma = 0;
			if(cantidad_zonas.length!=0){
				for (var i = 0; i < cantidad_zonas.length; i++) {
					cantidad_zonas[i].setMap(null);
				}
			}

			if(marcadores.length!=0){
				for (var i = 0; i < marcadores.length; i++) {
					marcadores[i].setMap(null);					
				}
				marcadores_aux  = [];

			}
		
			if(puestos.length!=0){
				for (var i = 0; i < puestos.length; i++) {
					puestos[i].setMap(null);
			  	}
			  	puestos = [];
			}

		    for(var a = 0; a < estacionamiento.length; a++){
		    	suma = suma + estacionamiento[a][1];
				}

			if (suma == 0){
				var fullColor 	= '#009900';
			}

			if (suma == estacionamiento.length){
				var fullColor 	= '#009900';
			}

			if ((estacionamiento.length-suma) ==1){
				var fullColor 	= '#ffff66';
			}
		
				  	
			var triangleCoords = [
			    new google.maps.LatLng(8.297352, -62.712321),
			    new google.maps.LatLng(8.298149, -62.710412),
			    new google.maps.LatLng(8.297098, -62.709993),
			    new google.maps.LatLng(8.295739, -62.711656),
			    new google.maps.LatLng(8.297352, -62.712321)
			  ];

			var zona = new google.maps.Polygon({
				    paths: triangleCoords,
				    strokeOpacity: 0.8,
				    strokeWeight: 2,
				    fillColor: fullColor,
				    fillOpacity: 0.35
				  	});

					zona.setMap(map);
				    cantidad_zonas.push(zona);				    		
		}
		
	    if (zoom <=18 & zoom>16){

	    	var sum_z = 0;
			var contador = 0;
			var arre_suma = [];

			for(var i = 0; i< zonas.length; i++){
				for(var j = 0; j<puestos_e.length; j++){
					if(puestos_e[j][0] == zonas[i]){
							sum_z = sum_z + puestos_e[j][1];
							contador = contador+1;
		    			}
				}
				arre_suma.push([sum_z,contador]);
		    	sum_z = 0;
		    	contador = 0;
			}

			if(cantidad_zonas.length!=0){
				for (var i = 0; i < cantidad_zonas.length; i++) {
					cantidad_zonas[i].setMap(null);
				}
			}

			if(marcadores.length!=0){
				for (var i = 0; i < marcadores.length; i++) {
					marcadores[i].setMap(null);					
				}
				marcadores_aux  = [];
			}
		
			if(puestos.length!=0){
				for (var i = 0; i < puestos.length; i++) {
					puestos[i].setMap(null);
			  	}
			  	puestos = [];
			}

			for(var a = 0; a < estacionamiento.length; a++){
				for(var i = 0; i < coordenada.length; i++){
					for(var j = 0; j < coordenada[i].length; j++){
						coordenadas.push(new google.maps.LatLng(coordenada[i][j][0], coordenada[i][j][1]));
					}

					if (zona_estado[i] == 1){
						var fullColor 	= '#FF0000';
						
					}
				  	if (zona_estado[i] == 0){
						var fullColor 	= '#009900';
						
				    }

				    if ((arre_suma[i][1]-arre_suma[i][0])==1){
						var fullColor 	= '#ffff66';
					}

				    

				    var zona = new google.maps.Polygon({
				    paths: coordenadas,
				    strokeOpacity: 0.8,
				    strokeWeight: 2,
				    fillColor: fullColor,
				    fillOpacity: 0.35
				  	});

					zona.setMap(map);
				    cantidad_zonas.push(zona);				    
					coordenadas =[];

						//var marker = new google.maps.Marker({ position: new google.maps.LatLng(8.297578, -62.711088), map:map,icon: pinImage});					
				}
			}

			for(var a =0; a < estacionamiento.length; a++){

				if (estacionamiento[a][1] == 1){
					var pinColor 	= "FF0000"; 
				    anuncio = estacionamiento[a][2]+' Sin puestos disponibles'; 
				}
				if (estacionamiento[a][1] == 0){
					var pinColor 	= "009900";
				  	anuncio = estacionamiento[a][2]+' Con puestos disponibles'; 
				}

				var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + pinColor,new google.maps.Size(21, 34),new google.maps.Point(0,0),new google.maps.Point(10, 34));

				var marker = new google.maps.Marker({ position: new google.maps.LatLng(estacionamiento[a][3], estacionamiento[a][4]), map:map,icon: pinImage});

								marcadores.push(marker);
				marcadores_aux.push(anuncio);
								
				google.maps.event.addListener(marker, 'click', (function(marker, a) {
					return function() {
					infowindow.setContent(marcadores_aux[a]);
					infowindow.open(map, marker);
					}
					})(marker, a));
			}
		}

		if (zoom>18){
			var sum_z = 0;
			var contador = 0;
			var arre_suma = [];

			for(var i = 0; i< zonas.length; i++){
				for(var j = 0; j<puestos_e.length; j++){
					if(puestos_e[j][0] == zonas[i]){
							sum_z = sum_z + puestos_e[j][1];
							contador = contador+1;
		    			}
				}
				arre_suma.push([sum_z,contador]);
		    	sum_z = 0;
		    	contador = 0;
			}

			if(cantidad_zonas.length!=0){
				for (var i = 0; i < cantidad_zonas.length; i++) {
					cantidad_zonas[i].setMap(null);
				}
			}

			if(marcadores.length!=0){
				for (var i = 0; i < marcadores.length; i++) {
					marcadores[i].setMap(null);					
				}
				marcadores_aux  = [];
			}
		

			if(puestos.length!=0){
				for (var i = 0; i < puestos.length; i++) {
					puestos[i].setMap(null);
			  	}
			  	puestos = [];
			}

		    for(var a = 0; a < estacionamiento.length; a++){
				for(var i = 0; i < coordenada.length; i++){

					for(var j = 0; j < coordenada[i].length; j++){
						coordenadas.push(new google.maps.LatLng(coordenada[i][j][0], coordenada[i][j][1]));
					}

					if (zona_estado[i] == 1){
						var fullColor 	= '#FF0000';
						
					}
				  	if (zona_estado[i] == 0){
						var fullColor 	= '#009900';
						
				    }
				    if ((arre_suma[i][1]-arre_suma[i][0])==1){
						var fullColor 	= '#ffff66';
					}

				    if (estacionamiento[a][1] == 1){
				    	var pinColor 	= "FF0000"; 
						anuncio = estacionamiento[a][2]+' Sin puestos disponibles'; 
					}
				  	if (estacionamiento[a][1] == 0){
				  		var pinColor 	= "009900";
						anuncio = estacionamiento[a][2]+' Con puestos disponibles'; 
				    }

				    var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + pinColor,new google.maps.Size(21, 34),new google.maps.Point(0,0),new google.maps.Point(10, 34));

				    var zona = new google.maps.Polygon({
				    paths: coordenadas,
				    strokeOpacity: 0.8,
				    strokeWeight: 2,
				    fillColor: fullColor,
				    fillOpacity: 0.35
				  	});

					zona.setMap(map);
				    cantidad_zonas.push(zona);	
				    var fullColor = '';
					var latitud_origen  = ((coordenadas[1].lat()-coordenadas[0].lat())/2)+coordenadas[0].lat();
					var longitud_origen = ((coordenadas[1].lng()-coordenadas[0].lng())/2)+coordenadas[0].lng();
					var origen = new google.maps.LatLng(latitud_origen,longitud_origen);

					var latitud_final  = ((coordenadas[3].lat()-coordenadas[2].lat())/2)+coordenadas[2].lat();
					var longitud_final = ((coordenadas[3].lng()-coordenadas[2].lng())/2)+coordenadas[2].lng();
					var destino = new google.maps.LatLng(latitud_final,longitud_final);
						  
					var distancia_total = calculo_distancia(origen, destino);
					var distancia_horizontal = (longitud_final - longitud_origen)/(cantidad_puestos[i].length+1);
						  
					var radio = (((distancia_total*(cantidad_puestos[i].length/(cantidad_puestos[i].length+1)))/cantidad_puestos[i].length+1)/2)*0.85;
					var latitud_aux = latitud_origen;
					var longitud_aux = longitud_origen;
						  
					for(var z = 0 ; z < cantidad_puestos[i].length ; z++){
						if (cantidad_puestos[i][z] == 1){
							var fullColor = '#FF0000'; 
						}
						if (cantidad_puestos[i][z] == 0){
							var fullColor = '#009900'; 
						}

						longitud_aux = longitud_aux + distancia_horizontal;
						latitud_aux =  ((latitud_final-latitud_origen)*((longitud_aux-longitud_origen)/(longitud_final-longitud_origen)))+latitud_origen;
						var origen = new google.maps.LatLng(latitud_aux,longitud_aux);
						var opcion_puesto = {
							fillColor: fullColor,
							fillOpacity: 0.85,
							map: map,
							center: origen,
							radius: 2,
							draggable:true
						};
						var puesto = new google.maps.Circle(opcion_puesto);
						puestos.push(puesto);
					}
										    
					coordenadas =[];
				}
			}

		}

    });

	return cantidad_zonas;
}  
		
function initialize() {
	var socket 		= io.connect();
	var boton  		= document.getElementById("sendButton");
	var estado   	= [];
  	var auxiliar 	= [];
  	var coordenada 	= [];
  	//var mapOptions 	= {zoom: 19,center: new google.maps.LatLng(8.297317, -62.710975),disableDefaultUI: true};  
  	var mapOptions 	= {zoom: 16,center: new google.maps.LatLng(8.295906, -62.711584),disableDefaultUI: true};  

  	map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);

  	//UBICACION GPS USUARIO
  	if(navigator.geolocation) {
  		navigator.geolocation.watchPosition(obtener_centro, locError, geo_options);
  	} else {
  		alert("Alerta de Navegador Su navegador no soporta esta aplicación");
  	}
    //boton.onclick = sonido;
    socket.on('info',function(data){
    	
    	estado_estacionamiento = data.estacionamiento;
    	
    	
    	console.log(data.puesto_estado)
    	for( i = 0; i < data.id_zona.length; i++){
    		for( j = 0; j < data.puesto_estado.length; j++){

    			if(data.puesto_estado[j][0] == data.id_zona[i]){
    				auxiliar.push(data.puesto_estado[j][1]);
    			}
    		}

  		estado.push(auxiliar);
  		auxiliar = [];
  		}

  		for( i = 0; i < data.id_zona.length; i++){
  			for( j = 0; j < data.direcciones.length; j++){
  				if(data.direcciones[j][0] == data.id_zona[i]){
  					auxiliar.push([data.direcciones[j][1],data.direcciones[j][2]]);
  				}
  			}

  		coordenada.push(auxiliar);
  		auxiliar = [];
  		}
  		
  		cantidad_zonas = crear_zona(coordenada,estado,data.zona_estado,cantidad_zonas,data.estacionamiento,data.id_zona,data.puesto_estado);
		coordenada = [];
		estado     = [];
	});
}


google.maps.event.addDomListener(window, 'load', initialize);