"""
Neural Network Models for Sign Language Recognition
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Sequential, Model
from tensorflow.keras.layers import (
    LSTM, Dense, Dropout, LayerNormalization,
    Bidirectional, Input, Flatten, Reshape,
    Conv1D, MaxPooling1D, Attention
)
import numpy as np


def create_sequence_recognition_model(
    sequence_length=30,
    input_shape=21,
    num_classes=26,
    lstm_units=128,
    dropout_rate=0.5
):
    """
    Create LSTM-based model for sequence-based sign recognition.
    
    Args:
        sequence_length: Number of frames in sequence
        input_shape: Number of hand landmarks (21 for MediaPipe hands)
        num_classes: Number of sign classes
        lstm_units: Number of LSTM units
        dropout_rate: Dropout rate
    
    Returns:
        Compiled Keras model
    """
    model = Sequential([
        Input(shape=(sequence_length, input_shape * 3)),  # 21 landmarks * 3 (x, y, z)
        
        # Normalize input
        LayerNormalization(epsilon=1e-6),
        
        # First LSTM layer
        Bidirectional(LSTM(
            lstm_units,
            activation='relu',
            return_sequences=True,
            recurrent_dropout=0.2
        )),
        Dropout(dropout_rate),
        
        # Second LSTM layer
        Bidirectional(LSTM(
            lstm_units // 2,
            activation='relu',
            return_sequences=False,
            recurrent_dropout=0.2
        )),
        Dropout(dropout_rate),
        
        # Dense layers
        Dense(256, activation='relu'),
        Dropout(dropout_rate),
        Dense(128, activation='relu'),
        Dropout(dropout_rate),
        Dense(64, activation='relu'),
        Dropout(dropout_rate),
        
        # Output layer
        Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy', keras.metrics.Precision(), keras.metrics.Recall()]
    )
    
    return model


def create_cnn_lstm_model(
    sequence_length=30,
    input_shape=21,
    num_classes=26,
    lstm_units=128,
    dropout_rate=0.5
):
    """
    Create CNN-LSTM hybrid model for better spatial-temporal feature extraction.
    
    Args:
        sequence_length: Number of frames in sequence
        input_shape: Number of hand landmarks (21 for MediaPipe hands)
        num_classes: Number of sign classes
        lstm_units: Number of LSTM units
        dropout_rate: Dropout rate
    
    Returns:
        Compiled Keras model
    """
    model = Sequential([
        Input(shape=(sequence_length, input_shape * 3)),
        
        # CNN layers for spatial feature extraction
        Conv1D(64, kernel_size=3, activation='relu', padding='same'),
        Conv1D(64, kernel_size=3, activation='relu', padding='same'),
        MaxPooling1D(pool_size=2),
        Dropout(dropout_rate * 0.5),
        
        Conv1D(128, kernel_size=3, activation='relu', padding='same'),
        Conv1D(128, kernel_size=3, activation='relu', padding='same'),
        MaxPooling1D(pool_size=2),
        Dropout(dropout_rate * 0.5),
        
        # LSTM layers for temporal feature extraction
        Bidirectional(LSTM(lstm_units, activation='relu', return_sequences=True)),
        Dropout(dropout_rate),
        
        Bidirectional(LSTM(lstm_units // 2, activation='relu', return_sequences=False)),
        Dropout(dropout_rate),
        
        # Dense layers
        Dense(256, activation='relu'),
        Dropout(dropout_rate),
        Dense(128, activation='relu'),
        Dropout(dropout_rate),
        
        # Output
        Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy', keras.metrics.Precision(), keras.metrics.Recall()]
    )
    
    return model


def create_attention_model(
    sequence_length=30,
    input_shape=21,
    num_classes=26,
    lstm_units=128,
    dropout_rate=0.5,
    num_heads=4
):
    """
    Create Transformer-based model with attention mechanisms.
    
    Args:
        sequence_length: Number of frames in sequence
        input_shape: Number of hand landmarks
        num_classes: Number of sign classes
        lstm_units: Number of units
        dropout_rate: Dropout rate
        num_heads: Number of attention heads
    
    Returns:
        Compiled Keras model
    """
    inputs = Input(shape=(sequence_length, input_shape * 3))
    x = LayerNormalization(epsilon=1e-6)(inputs)
    
    # Multi-head self attention
    attention_output = layers.MultiHeadAttention(
        num_heads=num_heads,
        key_dim=lstm_units // num_heads,
        dropout=dropout_rate
    )(x, x)
    x = layers.Add()([x, attention_output])
    x = LayerNormalization(epsilon=1e-6)(x)
    
    # Feed-forward network
    x = Dense(lstm_units * 2, activation='relu')(x)
    x = Dropout(dropout_rate)(x)
    x = Dense(lstm_units)(x)
    x = Dropout(dropout_rate)(x)
    
    # LSTM processing
    x = Bidirectional(LSTM(lstm_units // 2, activation='relu'))(x)
    x = Dropout(dropout_rate)(x)
    
    # Classification head
    x = Dense(256, activation='relu')(x)
    x = Dropout(dropout_rate)(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(dropout_rate)(x)
    outputs = Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs=inputs, outputs=outputs)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy', keras.metrics.Precision(), keras.metrics.Recall()]
    )
    
    return model


def create_simple_mlp_model(
    input_size=63,  # 21 landmarks * 3
    num_classes=26,
    dropout_rate=0.5
):
    """
    Create a simple MLP model for frame-based recognition (not sequence-based).
    
    Args:
        input_size: Size of flattened hand landmarks
        num_classes: Number of sign classes
        dropout_rate: Dropout rate
    
    Returns:
        Compiled Keras model
    """
    model = Sequential([
        Input(shape=(input_size,)),
        
        Dense(256, activation='relu'),
        Dropout(dropout_rate),
        
        Dense(128, activation='relu'),
        Dropout(dropout_rate),
        
        Dense(64, activation='relu'),
        Dropout(dropout_rate),
        
        Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


def get_model_summary(model):
    """
    Get model summary as string.
    
    Args:
        model: Keras model
    
    Returns:
        Model summary as string
    """
    import io
    import contextlib
    
    f = io.StringIO()
    with contextlib.redirect_stdout(f):
        model.summary()
    return f.getvalue()
