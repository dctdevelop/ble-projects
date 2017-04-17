var app = {
     device: null,
     map:null,
     marker:null,
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },

    receivedEvent: function(id) {
        ble.startScan([],function(device){
            console.log(device);
            if(device.name != undefined && device.name.indexOf("Syrus 3GBT") > -1){
                var element_id = device.name.substring(11);
                $("#list-syrus").append('<ons-list-item tappable id="'+ element_id +'">' + device.name  + '</ons-list-item>')
                $("#"+ element_id).click(function(){
                    connectSyrus(device);
                });
            }


        },function(error){
            console.error(error);
        })
    }

};


    function connectSyrus(device){ //Funcion que indica que Syrus BT se encuentra conectado 
        ble.connect(device.id,

            function(data){
                $("#list-syrus").toggle('fast');
                $("#commands").toggle('fast');
                console.log(data);
                app.device = device;
                window.setTimeout(function(){
                    authenticatheWithSyrus();
                    listenDataSyrus();
                },1000);
                window.setInterval(function(){
                    askQpv(); //Funcion que pregunta la posicion y la velocidad a Syrus cada 5 segundos
                },5000);
             });
    }

    function authenticatheWithSyrus(){ //Bloque de autentificacion con Syrus
        var text = "";
        var possible = "abcdef0123456789";

        for( var i=0; i < 8; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        var code = app.device.name.substr(app.device.name.length -5); //el codigo por default son los ultimos 5 numeros de IMEI
        code = text + md5(md5(code)+":"+text);
        var data = stringToBytes(">SBIK"+ code + "<"); //Comando de autentificacion 
        ble.writeWithoutResponse(app.device.id,        //Escribir al modulo Bluetooth sin esperar respuesta. 
            "00000000-dc70-0080-dc70-a07ba85ee4d6",
            "00000000-dc70-0180-dc70-a07ba85ee4d6",
            data,
            function(r){console.log(r)}, function(r){r});
    }


    function askQpv(){ //Funcion que pregunta Velocidad y Posicion a Syrus
        var data = stringToBytes(">QPV<");
        // send data to syrus without response
        ble.writeWithoutResponse(app.device.id,
            "00000000-dc70-0080-dc70-a07ba85ee4d6",
            "00000000-dc70-0180-dc70-a07ba85ee4d6",
            data,
            function(r){console.log(r)}, function(r){r});
    }


    function listenDataSyrus(){ //Funcion para escuchar data de Syrus
        ble.startNotification(app.device.id,
            "00000000-dc70-0080-dc70-a07ba85ee4d6",
            "00000000-dc70-0180-dc70-a07ba85ee4d6",
            function(data){datareceived(data)}, function(err){console.warn(err)});
    }

    function datareceived(data) //Funcion que analiza los datos recibidos y da formato a impresion en pantalla
    {
        var command = bytesToString(data);
        console.log(command) // show th command in console
        if  (command.indexOf("RPV") > -1){ //Verificar si lo que se obtiene es una respuesta al comando solicitado
            var data = parse_PV_info(command);
            console.log(data);

            if (data.velocity_kph<=80){ //Comprobar el valor de la velocidad recibido y compararlo contra el permitido 
                $(".speed").html(data.velocity_kph + "  Km/h"); //Mostrar la velocidad en Km/h. Invocacion JQuery
                
                $(".speed").css({   //Atributos en formato CSS, fondo, color de texto, tamaño de letra, alineación, negritas, y tamaño de la caja
                    "background-color": "green",
                    "color":"white",
                    "font-size": "800%",
                    "text-align": "center",
                    "font-weight": "bold",
                    "padding-bottom": "40px",
                    "padding-top": "40px"
                });
            }
            else{
                $(".speed").html(data.velocity_kph + "  Km/h");
                
                $(".speed").css({
                    "background-color": "red",
                    "color":"white",
                    "font-size": "800%",
                    "text-align": "center",
                    "font-weight": "bold",
                    "padding-bottom": "40px",
                    "padding-top": "40px"
                }); 
            }

        }

    }

    function disconnectSyrus(){ //Funcion para desconectar de Syrus. 
        ble.disconnect(app.device.id, function(){
            console.log("Disconnected");
            app.receivedEvent();
            $("#commands").toggle('fast');
            $("#list-syrus").toggle('fast');
            $("#list-syrus").html("");
        },  function(){
            console.error("ERROR");
        });
    }


    function stringToBytes(string){ //Funcion para convertir una cadena de caracteres en Bytes.
        var array = new Uint8Array(string.length);
        for(var i = 0, l = string.length; i < l; i++){
            array[i] = string.charCodeAt(i);
        }
        return array.buffer;
    }

    function bytesToString(buffer) { //Funcion para convertir Bytes en una cadena de caracteres. 
        return String.fromCharCode.apply(null, new Uint8Array(buffer));
    }



    function parse_PV_info(rawData){ //Funcion que decofica la consulta hecha de posición y velocidad 
        var data;                    //para obtener cada uno de los datos por separado. 
        data = {};
        data.imei = rawData.substring(rawData.indexOf("ID=")+3,rawData.indexOf("<"));
        data.time_of_day = rawData.substring(4,9);
        data.latitude = parseInt(rawData.substring(9,17))/100000;
        data.longitude = parseInt(rawData.substring(17,26))/100000;
        data.velocity_mph = parseInt(rawData.substring(26,29));
        data.velocity_kph = data.velocity_mph* 1.609344;
        data.orientation = rawData.substring(29,32);
        data.position_fix_mode = rawData.substring(32,33);
        data.age = rawData.substring(33,34);

        return data;
    }



app.initialize();