import * as events from 'events'
import mqtt = require('mqtt');

//Internal imports
import { CryptoUtils , RSAcredentials} from './../utils/crypto.utils';
import { StringUtils } from './../utils/string.utils';

export class IotnxtQueue extends events.EventEmitter {
  a = 0;
  RoutingKeyBase:any;
  connected:boolean = false;
  
  state: any = { "deviceGroups": {} };
  
  GatewayId:string = "";
  secretkey:string="";

  secret:any={}; //red queue stuff

  hostaddress:string = "";
  Make:string = "";
  Model:string = "";
  FirmwareVersion:string = "";
  Location:string="";
  
  Devices:any={};
  GatewayFirstContact:boolean=false;
  IsIoTHubDevice:boolean=false;
  Config:any={};
  ClientId:string="";
  modulus:string="";
  exponent:string="";
  AES:any={};

  mqttRed:mqtt.MqttClient|any;

  constructor(config:any, Devices:any, force:boolean) {
    super();

    this.GatewayId = config.GatewayId;
    this.hostaddress = config.hostaddress;

    this.Make = config.Make;
    this.Model = config.Model;
    this.FirmwareVersion = config.FirmwareVersion;
    this.Location = config.Location;
    this.secretkey = config.secretkey

    this.modulus = config.publickey.split("<").join(',').split(">").join(',').split(',')[8];
    this.exponent = config.publickey.split("<").join(',').split(">").join(',').split(',')[4]

    this.Devices = Devices;

    CryptoUtils.genAESkeys((AES:any)=>{
      this.AES = AES;
      this.connectGreenQ((err:Error,secret:any)=>{
        if (err) console.log(err);
        if (secret) {
          console.log("can now connect to red queue")
          
          this.connectRedQ((err:Error,result:any)=>{
            if (err) console.log(err);
            if (result) {
              console.log(result);
              this.register((err:Error, result:any)=>{
                this.mqttRed.subscribe(this.secret.RoutingKeyBase+".REQ", (err:Error)=>{
                  if (err) console.log(err);
                });

                this.mqttRed.on('message', (topic: any, message: any) => {
                  var json = JSON.parse(message.toString());
                  var payload = JSON.parse(Buffer.from(json.Payload, "base64").toString());
                  this.emit('request', payload);
                });

                this.emit('connect');
              });
            }


          });
        }
      });
    })

  }


  /* ################################################################################## */

  connectGreenQ(cb:any) {
    var greenOptions = {
      clientId: this.GatewayId + ".GREEN." + ((Date.now() * 10000) + 621355968000000000),
      username: "green1:public1",
      password: "publicpassword1",
      //rejectUnauthorized: false,
      //connectTimeout: 30 * 1000,
      //keepalive : 60
    }


    var replyKey = "MessageAuthNotify.".toUpperCase() + StringUtils.getGUID().toUpperCase();
    var mqttGreen = mqtt.connect("mqtts://" + this.hostaddress + ":8883", greenOptions);

    mqttGreen.on('error', (err: any) => { cb(err,undefined); })
    mqttGreen.on("offline", function(err:any) { cb(err,undefined); })
    mqttGreen.on("close", function(err:any) { cb(err,undefined);  })

    mqttGreen.on('connect', () => {
      console.log("GREEN CONNECTED!")
      mqttGreen.subscribe(replyKey, { qos: 0 }, (err: any, granted: any) => {
        if (granted) {
          console.log("IOTNXT CONNECT GREEN SUCCESS")
          ///
          var messageAuthRequest = {
            Uid: this.GatewayId,
            SecretKey: this.secretkey,
            PostUtc: new Date().toISOString(),
            Headers: {}
          }

          var cipher = CryptoUtils.createCipheriv(this.AES);
          var textBuffer = Buffer.from(JSON.stringify(messageAuthRequest));
          var encrypted = cipher.update(textBuffer)
          var encryptedFinal = cipher.final()

          var newBuffer = Buffer.concat([encrypted, encryptedFinal]);

          var RSAcreds: RSAcredentials = {
              modulus: this.modulus,
              exponent: this.exponent
          }

          var wrappedMessage = {
              Payload: newBuffer.toString("base64"),
              IsEncrypted: true,
              Headers: {
                  //SymKey: publicKeyRSA.encrypt(AES.key, "UTF8", "base64", ursa.RSA_PKCS1_PADDING).toString("base64"),
                  SymIv: CryptoUtils.RSAENCRYPT(this.AES.iv, RSAcreds),
                  SymKey: CryptoUtils.RSAENCRYPT(this.AES.key, RSAcreds)
              },
              PostUtc: new Date().toISOString(),
              ReplyKey: replyKey.toUpperCase()
          }

          mqttGreen.publish("MESSAGEAUTHREQUEST", JSON.stringify(wrappedMessage), { qos: 1 }, function (err: any) {
              if (err) { console.error("publisherror:" + err) }
          });
          ///
        }
      });
    });



    mqttGreen.on('message', (topic: string, message: Buffer, packet: any) => {
      var json = JSON.parse(message.toString());
      var payload = Buffer.from(json.Payload, "base64");
      var decipher = CryptoUtils.createDecipheriv(this.AES);
      var result = Buffer.concat([decipher.update(payload), decipher.final()]);
      var secret = JSON.parse(result.toString());
      
      
      
      mqttGreen.end(undefined, () => {
        console.log("disconnected from green queue cleanly")
        if (secret.Success == true) {
          this.secret = secret;
          cb(undefined, secret);
        } else {
          cb(secret, undefined);
        }
        
      })

    });
  }

  /* ################################################################################## */



  connectRedQ(cb:any) {
    
    var redoptions = {
      clientId: this.secret.ClientId + ".RED." + ((Date.now() * 10000) + 621355968000000000),
      username: this.secret.vHost + ":" + this.GatewayId,
      password: this.secret.Password,
      //rejectUnauthorized: false,
      //keepalive: 5
    }

    this.mqttRed = mqtt.connect("mqtts://" + this.secret.Hosts[0] + ":8883", redoptions);
    
    this.mqttRed.on('connect', () => { 
      console.log("MQTT RED CONNECTED")
      this.connected = true;
      cb(undefined,true);
    });

    this.mqttRed.on('reconnect', function () { console.log("Queue reconnected"); });
    this.mqttRed.on('close', function () { console.log("Queue disconnected");  });
    this.mqttRed.on('offline', function () { console.log("Queue has gone offline");  });
    
    this.mqttRed.on('error', function (error: any) { 
        console.log("error: " + error); 
    });
    
  }




  /* ################################################################################## */

  register(cb:any) {
    var packet = {
      "messageType": "Gateway.RegisterGatewayFromGateway.1",
      "args": { "gateway": {
        "GatewayId": this.GatewayId,
        "Make" : this.Make,
        "FirmwaveVersion": this.FirmwareVersion,
        "Location": this.Location,
        "Secret": this.secretkey,
        "Devices": this.Devices,
        "GatewayFirstContact": false,
        "IsIoTHubDevice":false,
        "ClientId": this.ClientId
      }},
      "expiresAt": new Date(new Date().getTime() + 15 * 1000).toISOString()
    }

    //console.log("=============================== !!!!")
    //console.log(JSON.stringify(packet));

    var textBuffer = Buffer.from(JSON.stringify(packet));

    var wrappedMessage = {
        Payload: textBuffer.toString("base64"),
        IsEncrypted: false,
        Headers: {},
        PostUtc: new Date().toISOString(),
        ReplyKey: "DAPI.1.DAPI.REPLY.1." + this.secret.ClientId.toUpperCase() + "." + StringUtils.getGUID().toUpperCase() + "." + StringUtils.getGUID().toUpperCase()
    }


    var subtopic = wrappedMessage.ReplyKey.toUpperCase(); //.split(".").join("/").toUpperCase();
    var topic = "DAPI.1.Gateway.RegisterGatewayFromGateway.1." + this.secret.ClientId + ".DEFAULT"

    
      
    this.mqttRed.publish(topic.toUpperCase(), JSON.stringify(wrappedMessage), function (err: any) {
      if (err) { console.log("ERROR:"); 
          console.log(err); 
      } else {
          cb(undefined, true); //SUCCESS
      }
    });
   
  }

  /* ################################################################################## */

  public updateState(route:any, property:any,  data:any) {
    console.log(this.GatewayId + " UPDATESTATE")
    //iotnxt.updateState(this.state, route, property, data );

    if (!this.state.deviceGroups) { this.state.deviceGroups = {}; }

    if (!this.state.deviceGroups[route]) { this.state.deviceGroups[route] = {}; }
    var before = this.state.deviceGroups[route][property];
    this.state.deviceGroups[route][property] = data;
    
    if (before != data) { 
        return { updated: 1 } 
    } else {
        return { updated: 0 }
    }

  }

  /* ################################################################################## */

  public publishState() {
    console.log(this.GatewayId + " PUBLISHING")
    

    var packet = JSON.parse(JSON.stringify(this.state)); 
    ///////

    packet.CommandText = "DigiTwin.Notification";
    packet.Headers = {
        "FileName": "",
        "Version": "2.15.0",
        "Raptor": "000000000000"
    };

    var dateNow = new Date();
    var fromUtc = new Date(dateNow.getTime() - 15 * 1000)

    packet.MessageId  = StringUtils.getGUID();
    packet.PostUtc = dateNow.toISOString();
    packet.MessageSourceId = null;
    packet.fromUtc = fromUtc.toISOString();
    packet.sourceMessageID = StringUtils.getGUID();

    //console.log(packet);

    var textBuffer = Buffer.from(JSON.stringify(packet));

    var wrappedMessage = {
        Payload: textBuffer.toString("base64"),
        IsEncrypted: false,
        Headers: {},
        PostUtc: new Date().toISOString()
    }

    //Persist state before sending
    //PersistenceService.insert(packet)

    try {

        var routingkey = this.secret.RoutingKeyBase + ".NFY"

        console.log(routingkey);
        this.mqttRed.publish(routingkey, JSON.stringify(wrappedMessage), { qos: 0 }, function (err:Error) {
            if (err) { console.log("ERROR:" + err) }
            
        });

    } catch (err) {
        console.error(`Failed to publish packet - \n Error : [${err}] \n [${JSON.stringify(wrappedMessage)}]`);
     }


  }

  /* ################################################################################## */

  public registerEndpoints(deviceTree:any, cb:Function) {
    console.log(this.GatewayId + " REGISTERING")
    
    this.Devices = deviceTree;
    this.register(cb);
    //iotnxt.reRegister(deviceTree, cb)
  }

} 


// callsback with this device's gateway
export function findDeviceGateway(deviceState:any, db:any, serverGateways:any, cb:any) {
  
  if (deviceState.iotnxtGatewayDefault) {
    cb(deviceState, deviceState.iotnxtGatewayDefault);
  }  else {
    //check account setting
    db.users.findOne({apikey:deviceState.apikey}, (err:Error, user:any) => {
      if (user.iotnxtGatewayDefault) { 
        //account has gateway set
        cb(deviceState, user.iotnxtGatewayDefault); 
      } else {  
        //account has no gateway set
        cb(deviceState, serverGateways[0]) //first in config serverwide
      }
    })
  }

  
} 


