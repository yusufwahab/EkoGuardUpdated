#include <Arduino.h>

// Individual Pin Definitions for 4 Ultrasonic Sensors
// Sensor 1
const int TRIG_1 = 13;
const int ECHO_1 = 14;

// Sensor 2
const int TRIG_2 = 16;
const int ECHO_2 = 17;

// Sensor 3
const int TRIG_3 = 18;
const int ECHO_3 = 19;

// Sensor 4
const int TRIG_4 = 21;
const int ECHO_4 = 22;

// Function to measure distance for a specific sensor (in cm)
float readDistanceCM(int trigPin, int echoPin) {
  // Ensure Trigger is clear
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  
  // Send 10 microsecond HIGH pulse
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // Measure pulse duration (timeout set to 30ms for ~5m max range)
  long duration = pulseIn(echoPin, HIGH, 30000);

  // Calculate distance in cm (Speed of sound = 0.0343 cm/us)
  if (duration == 0) {
    return -1.0; // Out of range or no echo detected
  }
  return (duration * 0.0343) / 2.0;
}

void setup() {
  Serial.begin(115200);

  // Configure Sensor 1 Pins
  pinMode(TRIG_1, OUTPUT);
  pinMode(ECHO_1, INPUT);
  digitalWrite(TRIG_1, LOW);

  // Configure Sensor 2 Pins
  pinMode(TRIG_2, OUTPUT);
  pinMode(ECHO_2, INPUT);
  digitalWrite(TRIG_2, LOW);

  // Configure Sensor 3 Pins
  pinMode(TRIG_3, OUTPUT);
  pinMode(ECHO_3, INPUT);
  digitalWrite(TRIG_3, LOW);

  // Configure Sensor 4 Pins
  pinMode(TRIG_4, OUTPUT);
  pinMode(ECHO_4, INPUT);
  digitalWrite(TRIG_4, LOW);

  Serial.println("--- 4 Ultrasonic Sensors Initialized ---");
}

void loop() {
  Serial.println("\n----------------------------------");
  
  // Reading Sensor 1
  float dist1 = readDistanceCM(TRIG_1, ECHO_1);
  Serial.print("Sensor 1: ");
  if (dist1 < 0) Serial.println("Out of range / No echo");
  else { Serial.print(dist1, 2); Serial.println(" cm"); }
  delay(50); // Delay between sensor readings to avoid ultrasonic crosstalk

  // Reading Sensor 2
  float dist2 = readDistanceCM(TRIG_2, ECHO_2);
  Serial.print("Sensor 2: ");
  if (dist2 < 0) Serial.println("Out of range / No echo");
  else { Serial.print(dist2, 2); Serial.println(" cm"); }
  delay(50);

  // Reading Sensor 3
  float dist3 = readDistanceCM(TRIG_3, ECHO_3);
  Serial.print("Sensor 3: ");
  if (dist3 < 0) Serial.println("Out of range / No echo");
  else { Serial.print(dist3, 2); Serial.println(" cm"); }
  delay(50);

  // Reading Sensor 4
  float dist4 = readDistanceCM(TRIG_4, ECHO_4);
  Serial.print("Sensor 4: ");
  if (dist4 < 0) Serial.println("Out of range / No echo");
  else { Serial.print(dist4, 2); Serial.println(" cm"); }
  
  // Full scan pause
  delay(500);
}