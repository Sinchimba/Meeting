"""
Utility functions for Sign Language Recognition
"""

import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def plot_training_history(history, output_dir='logs'):
    """
    Plot training history.
    
    Args:
        history: Keras training history object
        output_dir: Directory to save plots
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)
    
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    
    # Accuracy
    axes[0, 0].plot(history.history['accuracy'], label='Train')
    axes[0, 0].plot(history.history['val_accuracy'], label='Validation')
    axes[0, 0].set_title('Model Accuracy')
    axes[0, 0].set_xlabel('Epoch')
    axes[0, 0].set_ylabel('Accuracy')
    axes[0, 0].legend()
    axes[0, 0].grid(True)
    
    # Loss
    axes[0, 1].plot(history.history['loss'], label='Train')
    axes[0, 1].plot(history.history['val_loss'], label='Validation')
    axes[0, 1].set_title('Model Loss')
    axes[0, 1].set_xlabel('Epoch')
    axes[0, 1].set_ylabel('Loss')
    axes[0, 1].legend()
    axes[0, 1].grid(True)
    
    # Precision
    if 'precision' in history.history:
        axes[1, 0].plot(history.history['precision'], label='Train')
        axes[1, 0].plot(history.history['val_precision'], label='Validation')
        axes[1, 0].set_title('Model Precision')
        axes[1, 0].set_xlabel('Epoch')
        axes[1, 0].set_ylabel('Precision')
        axes[1, 0].legend()
        axes[1, 0].grid(True)
    
    # Recall
    if 'recall' in history.history:
        axes[1, 1].plot(history.history['recall'], label='Train')
        axes[1, 1].plot(history.history['val_recall'], label='Validation')
        axes[1, 1].set_title('Model Recall')
        axes[1, 1].set_xlabel('Epoch')
        axes[1, 1].set_ylabel('Recall')
        axes[1, 1].legend()
        axes[1, 1].grid(True)
    
    plt.tight_layout()
    
    # Save
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_path = output_dir / f'training_history_{timestamp}.png'
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    logger.info(f"Training history plot saved to {output_path}")
    plt.close()


def create_checkpoint_dir(model_name):
    """
    Create checkpoint directory for model.
    
    Args:
        model_name: Name of model
    
    Returns:
        Path to checkpoint directory
    """
    from config import LOGS_DIR
    
    checkpoint_dir = LOGS_DIR / model_name / datetime.now().strftime('%Y%m%d_%H%M%S')
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    
    return checkpoint_dir


def calculate_metrics(y_true, y_pred):
    """
    Calculate evaluation metrics.
    
    Args:
        y_true: True labels
        y_pred: Predicted labels
    
    Returns:
        Dictionary of metrics
    """
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score,
        f1_score, confusion_matrix, classification_report
    )
    
    metrics = {
        'accuracy': accuracy_score(y_true, y_pred),
        'precision': precision_score(y_true, y_pred, average='weighted', zero_division=0),
        'recall': recall_score(y_true, y_pred, average='weighted', zero_division=0),
        'f1': f1_score(y_true, y_pred, average='weighted', zero_division=0),
        'confusion_matrix': confusion_matrix(y_true, y_pred).tolist(),
        'classification_report': classification_report(y_true, y_pred, zero_division=0)
    }
    
    return metrics


def plot_confusion_matrix(cm, class_names, output_dir='logs'):
    """
    Plot confusion matrix.
    
    Args:
        cm: Confusion matrix
        class_names: List of class names
        output_dir: Directory to save plot
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)
    
    fig, ax = plt.subplots(figsize=(10, 8))
    
    im = ax.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.colorbar(im, ax=ax)
    
    ax.set(xticks=np.arange(cm.shape[1]),
           yticks=np.arange(cm.shape[0]),
           yticklabels=class_names,
           xticklabels=class_names)
    
    ax.set_xlabel('Predicted')
    ax.set_ylabel('True')
    ax.set_title('Confusion Matrix')
    
    # Add text annotations
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, format(cm[i, j], 'd'),
                   ha="center", va="center",
                   color="white" if cm[i, j] > cm.max() / 2 else "black")
    
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")
    plt.tight_layout()
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_path = output_dir / f'confusion_matrix_{timestamp}.png'
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    logger.info(f"Confusion matrix saved to {output_path}")
    plt.close()


def normalize_landmarks(landmarks):
    """
    Normalize landmarks to [-1, 1] range.
    
    Args:
        landmarks: Landmark array
    
    Returns:
        Normalized landmarks
    """
    landmarks = landmarks.copy()
    
    # Find max distance from origin
    max_dist = np.max(np.abs(landmarks))
    
    if max_dist > 0:
        landmarks = landmarks / max_dist
    
    return landmarks


def smooth_predictions(predictions, window_size=5):
    """
    Apply smoothing to prediction sequence.
    
    Args:
        predictions: List of predictions
        window_size: Size of smoothing window
    
    Returns:
        Smoothed predictions
    """
    if len(predictions) < window_size:
        return predictions
    
    smoothed = []
    half_window = window_size // 2
    
    for i in range(len(predictions)):
        start = max(0, i - half_window)
        end = min(len(predictions), i + half_window + 1)
        window = predictions[start:end]
        
        # Most common prediction in window
        most_common = max(set(window), key=window.count)
        smoothed.append(most_common)
    
    return smoothed


def setup_logging(log_dir='logs'):
    """
    Setup logging configuration.
    
    Args:
        log_dir: Directory for log files
    
    Returns:
        Logger instance
    """
    import logging
    
    log_dir = Path(log_dir)
    log_dir.mkdir(exist_ok=True)
    
    logger = logging.getLogger(__name__)
    
    # File handler
    fh = logging.FileHandler(log_dir / 'sign_recognition.log')
    fh.setLevel(logging.DEBUG)
    
    # Console handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    fh.setFormatter(formatter)
    ch.setFormatter(formatter)
    
    logger.addHandler(fh)
    logger.addHandler(ch)
    
    return logger


def compute_hand_features(landmarks):
    """
    Compute hand features from landmarks.
    
    Args:
        landmarks: Landmark array of shape (21, 3)
    
    Returns:
        Feature vector
    """
    landmarks = landmarks.reshape(21, 3)
    
    # Compute hand span
    hand_span = np.linalg.norm(landmarks[9] - landmarks[0])  # Middle finger to wrist
    
    # Compute finger distances from palm
    palm_center = np.mean(landmarks[:5], axis=0)  # First 5 landmarks form palm
    finger_distances = [
        np.linalg.norm(landmarks[i] - palm_center) 
        for i in [8, 12, 16, 20]  # Fingertips
    ]
    
    # Compute hand orientation
    thumb = landmarks[4]
    index = landmarks[8]
    hand_orientation = np.arctan2(index[1] - thumb[1], index[0] - thumb[0])
    
    features = np.concatenate([
        [hand_span],
        finger_distances,
        [hand_orientation]
    ])
    
    return features
