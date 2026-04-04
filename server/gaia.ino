#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#define SOUND_VELOCITY 0.034

const char* ssid="saharsh";
const char* password="12345678";

AsyncWebServer server(80);


const int trigPin=5;
const int echoPin=4;  
const int relayPin=19;
const int tempPin=34;
unsigned long previousMillis;
int onTime=300000;
int offTime=3600000;
bool relayState=false;

void setup() {
  Serial.begin(115200); // Starts the serial communication
  analogReadResolution(8);
  //analogSetAttenuation(ADC_2_5db);
  //Wi-Fi pls work 🤞🙏🙏
  WiFi.begin(ssid, password);
  while (WiFi.status()!=WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting...");
  }
  Serial.println(WiFi.localIP()); // Note of this IP dummy

server.on("/relaySwitch", HTTP_GET, [](AsyncWebServerRequest *request){
    toggleRelay();
    request->send(200, "text/plain", relayState?"ON":"OFF");
});
server.on("/measureWaterDist", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/plain", String(distanceCalc()));
});
server.on("/measureTemp", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/plain", String(measureTemp()));
});
//change onTime
server.on("/changeOnTime", HTTP_GET, [](AsyncWebServerRequest *request){
  int time=0;

    if (request->hasParam("val")){
        String inputMessage = request->getParam("val")->value();
        time=inputMessage.toInt(); 
        changeOnTime(time);
        request->send(200, "text/plain", "On time set to " + String(time));
    } else {
        request->send(400, "text/plain", "Error: No 'val' parameter found");
    }
});

//change offTime
server.on("/changeOffTime", HTTP_GET, [](AsyncWebServerRequest *request){
  int time=0;

    if (request->hasParam("val")){
        String inputMessage = request->getParam("val")->value();
        time=inputMessage.toInt(); 
        changeOffTime(time);
        request->send(200, "text/plain", "Off time set to " + String(time));
    } else {
        request->send(400, "text/plain", "Error: No 'val' parameter found");
    }
});

  pinMode(trigPin, OUTPUT); // Sets the trigPin as an Output
  pinMode(echoPin, INPUT);  // Sets the echoPin as an Input
  pinMode(relayPin, OUTPUT); // Sets the relay as an Output
  pinMode(tempPin, OUTPUT); // Sets the relay as an Output

  server.begin();
}

void loop() {
   //distanceCalc();
// delay(1000);
  // measureTemp();
  // delay(1000);
  unsigned long currentMillis = millis();
  unsigned long interval = relayState ? onTime : offTime;

  if (currentMillis-previousMillis>=interval) {
    previousMillis=currentMillis;
    toggleRelay();
    Serial.print("Relay is now: ");
    Serial.println(relayState ? "ON" : "OFF");
  }
}

  

float distanceCalc(){
  long duration;
  float distanceCm;
  // Clears the trigPin
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  // Reads the echoPin, returns the sound wave travel time in microseconds
  duration = pulseIn(echoPin, HIGH);
  
  // Calculate the distance
  distanceCm = duration*SOUND_VELOCITY/2;
  
  // Prints the distance in the Serial Monitor
  Serial.print("Distance (cm): ");
  Serial.println(distanceCm);
  return distanceCm;

}

void toggleRelay(){
    relayState=!relayState;
    digitalWrite(relayPin,relayState?HIGH:LOW);
    Serial.println("RelayState:");
    Serial.println(relayState);

}
void changeOnTime(int time){
    onTime=time;
    Serial.println("On time:");
    Serial.println(time);
}
void changeOffTime(int time){
    offTime=time;
    Serial.println("OffTime:");
    Serial.println(time);
}

float measureTemp(){
  const int samples = 10;
  float calibrate=1.28;
  float adcSum = 0;
  //avgerage
   for (int i = 0; i < samples; i++) {
     adcSum +=analogRead(tempPin);
     delay(10);
     }
  float avgAdc = adcSum / samples;
  float milliVolts = (avgAdc / 255.0) * 3300.0*calibrate;
  float tempC = (milliVolts-500.0)/10.0;
  Serial.print("Temperature: ");
  Serial.print(tempC);
  Serial.println(" °C");
  return tempC;
}