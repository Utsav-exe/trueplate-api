import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

type DimensionsData = {
  height_cm: number;
  width_cm: number;
  length_cm: number;
};

export default function App() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dimensions, setDimensions] = useState<DimensionsData | null>(null);
  const [cameraDistance, setCameraDistance] = useState("30.0");

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setDimensions(null);
    }
  };

  const calculateDimensions = async () => {
    if (!imageUri) {
      alert("Capture a meal first to begin scanning.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      
      const imageResponse = await fetch(imageUri);
      const imageBlob = await imageResponse.blob();
      formData.append('image', imageBlob, 'meal.jpg');
      
      const dummyBlob = new Blob([''], { type: 'application/octet-stream' });
      formData.append('depth_map', dummyBlob, 'placeholder.npy');
      formData.append('camera_distance', cameraDistance); 

      const response = await fetch('http://127.0.0.1:8000/calculate-dimensions', {
        method: 'POST',
        body: formData, 
      });
      
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const data = await response.json();
      setDimensions(data.dimensions); 
      
    } catch (error) {
      console.error("Network Error:", error);
      alert("Scanner offline. Check backend connection.");
    } finally {
      setIsAnalyzing(false); 
    }
  };

  return (
    <View style={styles.container}>
      
      {/* 1. TOP HALF: FULL BLEED MEDIA AREA */}
      <View style={styles.mediaArea}>
        {imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.fullImage} />
            {isAnalyzing && (
              <View style={styles.scanningOverlay}>
                <View style={styles.scanLine} />
                <Text style={styles.scanningText}>PROCESSING 3D MAP...</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyMedia}>
            <Ionicons name="cube-outline" size={64} color="#333333" />
            <Text style={styles.emptyMediaText}>AWAITING TARGET</Text>
          </View>
        )}

        {/* Top left subtle branding */}
        <SafeAreaView style={styles.brandingOverlay}>
          <View style={styles.glassBadge}>
             <Ionicons name="scan" size={14} color="#06B6D4" />
             <Text style={styles.brandingText}>TruePlate Engine</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* 2. BOTTOM SHEET: OVERLAPPING INTERFACE */}
      <View style={styles.bottomSheet}>
        
        {/* Floating Action Button (Sits right on the border) */}
        <View style={styles.fabContainer}>
          <TouchableOpacity 
            style={[styles.fab, isAnalyzing && styles.fabDisabled]} 
            onPress={imageUri ? calculateDimensions : pickImage}
            activeOpacity={0.8}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#000" size="large" />
            ) : (
              <Ionicons name={imageUri ? "scan-circle" : "camera"} size={36} color="#000" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
          
          {/* Header row in sheet */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Volume Metrics</Text>
            {imageUri && (
              <TouchableOpacity onPress={pickImage} style={styles.retakeBtn}>
                <Ionicons name="refresh" size={16} color="#A3A3A3" />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* RESULTS HUD */}
          {dimensions ? (
            <View style={styles.hudGrid}>
              <View style={styles.hudBox}>
                <Text style={styles.hudLabel}>WIDTH</Text>
                <View style={styles.hudValueRow}>
                  <Text style={styles.hudValue}>{dimensions.width_cm}</Text>
                  <Text style={styles.hudUnit}>cm</Text>
                </View>
              </View>
              
              <View style={styles.hudDivider} />
              
              <View style={styles.hudBox}>
                <Text style={styles.hudLabel}>LENGTH</Text>
                <View style={styles.hudValueRow}>
                  <Text style={styles.hudValue}>{dimensions.length_cm}</Text>
                  <Text style={styles.hudUnit}>cm</Text>
                </View>
              </View>

              <View style={styles.hudDivider} />

              <View style={styles.hudBox}>
                <Text style={styles.hudLabel}>HEIGHT</Text>
                <View style={styles.hudValueRow}>
                  <Text style={styles.hudValue}>{dimensions.height_cm}</Text>
                  <Text style={styles.hudUnit}>cm</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyHud}>
              <Text style={styles.emptyHudText}>Upload an image and hit scan to generate 3D metrics.</Text>
            </View>
          )}

          {/* SENSOR CALIBRATION (Dark Mode Input) */}
          <View style={styles.calibrationSection}>
            <View style={styles.calibHeader}>
              <Ionicons name="options" size={16} color="#06B6D4" />
              <Text style={styles.calibTitle}>LENS CALIBRATION (CM)</Text>
            </View>
            
            <View style={styles.inputWrapper}>
              <TextInput 
                style={styles.techInput}
                keyboardType="numeric"
                value={cameraDistance}
                onChangeText={setCameraDistance}
                selectionColor="#06B6D4"
                placeholderTextColor="#555"
              />
              <Text style={styles.inputHelper}>
                Adjust simulated focal distance to fix scale errors.
              </Text>
            </View>
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure OLED black
  },

  // 1. TOP MEDIA AREA
  mediaArea: {
    height: '55%', // Takes up top half
    width: '100%',
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.85, // Slight dim for HUD contrast
  },
  emptyMedia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMediaText: {
    color: '#333333',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 12,
  },
  brandingOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 40,
    left: 20,
  },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)', // Cyan glow border
  },
  brandingText: {
    color: '#E5E5E5',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 1,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#06B6D4',
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: '#06B6D4',
    position: 'absolute',
    top: '50%',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  scanningText: {
    color: '#06B6D4',
    fontWeight: '900',
    letterSpacing: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  // 2. OVERLAPPING BOTTOM SHEET
  bottomSheet: {
    flex: 1,
    marginTop: -40, // Pulls the sheet up OVER the image
    backgroundColor: '#121212', // Rich charcoal
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 50, // Space for the FAB
    paddingBottom: 40,
  },

  // FLOATING ACTION BUTTON
  fabContainer: {
    position: 'absolute',
    top: -35, // Halfway outside the sheet
    width: '100%',
    alignItems: 'center',
    zIndex: 10, // Ensures it sits above everything
  },
  fab: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#06B6D4', // Vibrant Cyan
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#121212', // Creates a cutout effect
  },
  fabDisabled: {
    backgroundColor: '#555',
    shadowOpacity: 0,
  },

  // SHEET HEADER
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  retakeText: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // HUD GRID
  hudGrid: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 30,
  },
  hudBox: {
    flex: 1,
    alignItems: 'center',
  },
  hudDivider: {
    width: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 10,
  },
  hudLabel: {
    color: '#737373',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  hudValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  hudValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300', // Thin, elegant numbers
  },
  hudUnit: {
    color: '#06B6D4',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyHud: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 30,
  },
  emptyHudText: {
    color: '#737373',
    textAlign: 'center',
    lineHeight: 20,
  },

  // CALIBRATION SECTION
  calibrationSection: {
    marginTop: 10,
  },
  calibHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  calibTitle: {
    color: '#06B6D4',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginLeft: 8,
  },
  inputWrapper: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  techInput: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 8,
    marginBottom: 12,
  },
  inputHelper: {
    color: '#737373',
    fontSize: 12,
    lineHeight: 18,
  },
});