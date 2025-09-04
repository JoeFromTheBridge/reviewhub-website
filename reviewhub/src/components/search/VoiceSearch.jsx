import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import api from '@/services/api'; // <— use alias + default export

const VoiceSearch = ({ onSearchResults, onSearchParams, className = '' }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState('');
  const [voiceQuery, setVoiceQuery] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError('');
        setTranscript('');
        setFinalTranscript('');
        speak('Listening for your search query...');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscriptLocal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          const c = event.results[i][0].confidence;

          if (event.results[i].isFinal) {
            finalTranscriptLocal += t;
            setConfidence(c);
          } else {
            interimTranscript += t;
          }
        }

        setTranscript(interimTranscript);
        if (finalTranscriptLocal) {
          setFinalTranscript(finalTranscriptLocal);
          // Auto-stop after getting final result
          clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            stopListening();
          }, 1000);
        }
      };

      recognition.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        speak('Sorry, I had trouble understanding. Please try again.');
      };

      recognition.onend = () => {
        setIsListening(false);
        if (finalTranscript) {
          processVoiceQuery(finalTranscript);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [finalTranscript]);

  const speak = (text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    if (!isSupported) {
      setError('Speech recognition is not supported in your browser');
      return;
    }
    if (recognitionRef.current && !isListening) {
      setError('');
      setVoiceQuery(null);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const processVoiceQuery = async (text) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    setError('');

    try {
      // Process the voice query
      const response = await api.processVoiceQuery(text);
      setVoiceQuery(response);

      // Provide audio feedback
      const conf = response.confidence;
      if (conf > 0.8) {
        speak(`I understood: ${response.processed_text}. Searching now...`);
      } else if (conf > 0.6) {
        speak(`I think you said: ${response.processed_text}. Let me search for that.`);
      } else {
        speak(`I'm not sure I understood correctly. Searching for: ${response.processed_text}`);
      }

      // Perform the search
      const searchResponse = await api.voiceSearch(text);

      // Pass results to parent components
      if (onSearchResults) onSearchResults(searchResponse.search_results);
      if (onSearchParams) onSearchParams(searchResponse.search_params);

      // Provide results feedback
      const resultCount = searchResponse.search_results?.products?.length || 0;
      if (resultCount > 0) {
        speak(`Found ${resultCount} products matching your search.`);
      } else {
        speak('No products found. Try a different search term.');
      }
    } catch (err) {
      console.error('Voice search error:', err);
      setError('Failed to process voice search. Please try again.');
      speak('Sorry, there was an error processing your search. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSuggestions = async (text) => {
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await api.getVoiceSearchSuggestions(text);
      setSuggestions(response.suggestions || []);
    } catch (err) {
      console.error('Error getting suggestions:', err);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFinalTranscript(suggestion);
    processVoiceQuery(suggestion);
    setSuggestions([]);
  };

  const getConfidenceColor = (c) => (c >= 0.8 ? 'bg-green-500' : c >= 0.6 ? 'bg-yellow-500' : 'bg-red-500');
  const getConfidenceText = (c) => (c >= 0.8 ? 'High' : c >= 0.6 ? 'Medium' : 'Low');

  if (!isSupported) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Voice search is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Safari.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Control Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            variant={isListening ? 'destructive' : 'default'}
            size="lg"
            className="flex-1"
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Start Voice Search
              </>
            )}
          </Button>

          <Button onClick={isSpeaking ? stopSpeaking : () => speak('Voice search is ready')} variant="outline" size="lg">
            {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          {isListening && (
            <Badge variant="default" className="animate-pulse">
              <Mic className="h-3 w-3 mr-1" />
              Listening...
            </Badge>
          )}
          {isProcessing && (
            <Badge variant="secondary">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Processing...
            </Badge>
          )}
          {isSpeaking && (
            <Badge variant="outline">
              <Volume2 className="h-3 w-3 mr-1" />
              Speaking...
            </Badge>
          )}
        </div>

        {/* Transcript Display */}
        {(transcript || finalTranscript) && (
          <div className="space-y-2">
            <div className="text-sm font-medium">What I heard:</div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-600">
                {transcript && <span className="italic">{transcript}</span>}
                {finalTranscript && <span className="font-medium text-gray-900">{finalTranscript}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Voice Query Results */}
        {voiceQuery && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Query Processed</span>
              <Badge variant="outline" className={`${getConfidenceColor(voiceQuery.confidence)} text-white`}>
                {getConfidenceText(voiceQuery.confidence)} Confidence
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="font-medium text-gray-700">Intent:</div>
                <div className="capitalize">{voiceQuery.intent?.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Processed Text:</div>
                <div>{voiceQuery.processed_text}</div>
              </div>
            </div>

            {voiceQuery.entities && Object.keys(voiceQuery.entities).length > 0 && (
              <div>
                <div className="font-medium text-gray-700 mb-2">Extracted Information:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(voiceQuery.entities).map(([key, value]) => (
                    <Badge key={key} variant="secondary">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Suggestions:</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Usage Tips */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="font-medium">Voice Search Tips:</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Try: "Find wireless headphones under $100"</li>
            <li>Try: "Show me 5-star rated laptops"</li>
            <li>Try: "Search for Nike running shoes"</li>
            <li>Try: "Looking for electronics in the smartphone category"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceSearch;
