/**
 * ASS Subtitle Parser
 * 
 * This utility parses Advanced SubStation Alpha (ASS) subtitle files and extracts
 * styling, timing, and positioning information for rendering subtitles.
 */

interface AssStyle {
  name: string;
  fontname: string;
  fontsize: number;
  primaryColor: string;
  secondaryColor: string;
  outlineColor: string;
  backColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeout: boolean;
  scaleX: number;
  scaleY: number;
  spacing: number;
  angle: number;
  borderStyle: number;
  outline: number;
  shadow: number;
  alignment: number;
  marginL: number;
  marginR: number;
  marginV: number;
  encoding: number;
}

interface AssDialogue {
  layer: number;
  start: number; // in milliseconds
  end: number; // in milliseconds
  style: string;
  name: string;
  marginL: number;
  marginR: number;
  marginV: number;
  effect: string;
  text: string;
  // Parsed properties
  parsedText: string;
  overrideStyles: any;
}

interface AssFile {
  info: Record<string, string>;
  styles: Record<string, AssStyle>;
  dialogues: AssDialogue[];
}

/**
 * Converts ASS time format (H:MM:SS.CC) to milliseconds
 */
const timeToMs = (time: string): number => {
  const match = time.match(/^(\d+):(\d{2}):(\d{2})\.(\d{2})$/);
  if (!match) return 0;
  
  const [_, hours, minutes, seconds, centiseconds] = match;
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(centiseconds) * 10
  );
};

/**
 * Parses ASS color format (&HAABBGGRR) to CSS color
 */
const parseAssColor = (assColor: string): string => {
  if (!assColor || !assColor.startsWith('&H')) return 'rgba(255, 255, 255, 1)';
  
  // ASS colors are in format &HAABBGGRR (AA=alpha, BB=blue, GG=green, RR=red)
  const colorMatch = assColor.match(/&H([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})/);
  if (!colorMatch) return 'rgba(255, 255, 255, 1)';
  
  const [_, alpha, blue, green, red] = colorMatch;
  const a = 1 - parseInt(alpha, 16) / 255;
  const r = parseInt(red, 16);
  const g = parseInt(green, 16);
  const b = parseInt(blue, 16);
  
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
};

/**
 * Parses ASS override tags in dialogue text
 */
const parseOverrideTags = (text: string): { parsedText: string; overrideStyles: any } => {
  const overrideStyles: any = {};
  
  // Remove all override blocks and collect style information
  const parsedText = text.replace(/\{\\([^}]*)\}/g, (match, overrides) => {
    // Split by backslash for multiple override commands
    const commands = overrides.split('\\').filter(Boolean);
    
    commands.forEach((cmd: string) => {
      // Font size
      if (cmd.startsWith('fs')) {
        overrideStyles.fontSize = parseInt(cmd.substring(2));
      }
      // Bold
      else if (cmd === 'b1') {
        overrideStyles.fontWeight = 'bold';
      }
      else if (cmd === 'b0') {
        overrideStyles.fontWeight = 'normal';
      }
      // Italic
      else if (cmd === 'i1') {
        overrideStyles.fontStyle = 'italic';
      }
      else if (cmd === 'i0') {
        overrideStyles.fontStyle = 'normal';
      }
      // Underline
      else if (cmd === 'u1') {
        overrideStyles.textDecoration = 'underline';
      }
      else if (cmd === 'u0') {
        overrideStyles.textDecoration = 'none';
      }
      // Primary color
      else if (cmd.startsWith('1c') || cmd.startsWith('c')) {
        const colorValue = cmd.substring(cmd.indexOf('&H'));
        overrideStyles.color = parseAssColor(colorValue);
      }
      // Position
      else if (cmd.startsWith('pos')) {
        const posMatch = cmd.match(/pos\((\d+),(\d+)\)/);
        if (posMatch) {
          overrideStyles.position = {
            x: parseInt(posMatch[1]),
            y: parseInt(posMatch[2]),
          };
        }
      }
      // Alignment
      else if (cmd.startsWith('an')) {
        overrideStyles.alignment = parseInt(cmd.substring(2));
      }
    });
    
    return ''; // Remove the override block from text
  });
  
  return { parsedText, overrideStyles };
};

/**
 * Parses an ASS subtitle file content
 */
export const parseAssFile = (content: string): AssFile => {
  const lines = content.split('\n');
  const result: AssFile = {
    info: {},
    styles: {},
    dialogues: [],
  };
  
  let currentSection = '';
  
  lines.forEach((line) => {
    line = line.trim();
    
    // Check for section headers
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.substring(1, line.length - 1);
      return;
    }
    
    // Skip empty lines or comments
    if (!line || line.startsWith(';')) return;
    
    // Process based on current section
    switch (currentSection) {
      case 'Script Info':
        const infoMatch = line.match(/^([^:]+):\s*(.*)$/);
        if (infoMatch) {
          result.info[infoMatch[1].trim()] = infoMatch[2].trim();
        }
        break;
        
      case 'V4+ Styles':
      case 'V4 Styles':
        if (line.startsWith('Style:')) {
          const parts = line.substring(6).split(',').map(part => part.trim());
          const style: AssStyle = {
            name: parts[0],
            fontname: parts[1],
            fontsize: parseFloat(parts[2]),
            primaryColor: parseAssColor(parts[3]),
            secondaryColor: parseAssColor(parts[4]),
            outlineColor: parseAssColor(parts[5]),
            backColor: parseAssColor(parts[6]),
            bold: parts[7] === '-1',
            italic: parts[8] === '-1',
            underline: parts[9] === '-1',
            strikeout: parts[10] === '-1',
            scaleX: parseFloat(parts[11]),
            scaleY: parseFloat(parts[12]),
            spacing: parseFloat(parts[13]),
            angle: parseFloat(parts[14]),
            borderStyle: parseInt(parts[15]),
            outline: parseFloat(parts[16]),
            shadow: parseFloat(parts[17]),
            alignment: parseInt(parts[18]),
            marginL: parseInt(parts[19]),
            marginR: parseInt(parts[20]),
            marginV: parseInt(parts[21]),
            encoding: parseInt(parts[22]),
          };
          result.styles[style.name] = style;
        }
        break;
        
      case 'Events':
        if (line.startsWith('Dialogue:')) {
          const parts = line.substring(9).split(',');
          const textIndex = 9; // Index where the text part starts
          const text = parts.slice(textIndex).join(',');
          
          // Parse override styles and clean text
          const { parsedText, overrideStyles } = parseOverrideTags(text);
          
          const dialogue: AssDialogue = {
            layer: parseInt(parts[0]),
            start: timeToMs(parts[1]),
            end: timeToMs(parts[2]),
            style: parts[3],
            name: parts[4],
            marginL: parseInt(parts[5]),
            marginR: parseInt(parts[6]),
            marginV: parseInt(parts[7]),
            effect: parts[8],
            text,
            parsedText,
            overrideStyles,
          };
          result.dialogues.push(dialogue);
        }
        break;
    }
  });
  
  return result;
};

/**
 * Gets active dialogues for a specific timestamp
 */
export const getActiveDialogues = (assFile: AssFile, currentTime: number): AssDialogue[] => {
  return assFile.dialogues.filter(
    dialogue => currentTime >= dialogue.start && currentTime <= dialogue.end
  );
};

/**
 * Generates React Native style object from ASS style and override styles
 */
export const generateStyleFromAss = (assFile: AssFile, dialogue: AssDialogue): any => {
  const baseStyle = assFile.styles[dialogue.style] || {};
  const { overrideStyles } = dialogue;
  
  // Base style from the Style definition
  const style: any = {
    color: baseStyle.primaryColor || '#ffffff',
    fontSize: baseStyle.fontsize || 24,
    fontWeight: baseStyle.bold ? 'bold' : 'normal',
    fontStyle: baseStyle.italic ? 'italic' : 'normal',
    textDecorationLine: baseStyle.underline ? 'underline' : 'none',
    letterSpacing: baseStyle.spacing || 0,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: baseStyle.shadow || 0,
    textShadowColor: baseStyle.outlineColor || 'rgba(0, 0, 0, 0.8)',
    backgroundColor: 'transparent',
    padding: 2,
    textAlign: 'center',
  };
  
  // Apply override styles
  if (overrideStyles.fontWeight) style.fontWeight = overrideStyles.fontWeight;
  if (overrideStyles.fontStyle) style.fontStyle = overrideStyles.fontStyle;
  if (overrideStyles.textDecoration) style.textDecorationLine = overrideStyles.textDecoration;
  if (overrideStyles.fontSize) style.fontSize = overrideStyles.fontSize;
  if (overrideStyles.color) style.color = overrideStyles.color;
  
  // Handle positioning based on alignment
  const alignment = overrideStyles.alignment || baseStyle.alignment || 2;
  
  // ASS alignment: 1-3 bottom, 4-6 middle, 7-9 top
  // 1/4/7 left, 2/5/8 center, 3/6/9 right
  let position: any = {};
  
  // Vertical alignment
  if (alignment >= 7) { // Top
    position.top = dialogue.marginV || baseStyle.marginV || 20;
    position.bottom = undefined;
  } else if (alignment >= 4) { // Middle
    position.top = '50%';
    position.transform = [{ translateY: -style.fontSize / 2 }];
  } else { // Bottom
    position.bottom = dialogue.marginV || baseStyle.marginV || 20;
    position.top = undefined;
  }
  
  // Horizontal alignment
  if (alignment % 3 === 1) { // Left
    position.left = dialogue.marginL || baseStyle.marginL || 20;
    position.right = undefined;
    style.textAlign = 'left';
  } else if (alignment % 3 === 0) { // Right
    position.right = dialogue.marginR || baseStyle.marginR || 20;
    position.left = undefined;
    style.textAlign = 'right';
  } else { // Center
    position.left = '50%';
    position.right = undefined;
    style.textAlign = 'center';
    if (!position.transform) {
      position.transform = [];
    }
    position.transform.push({ translateX: -50 });
  }
  
  // Override with explicit position if provided
  if (overrideStyles.position) {
    position = {
      left: overrideStyles.position.x,
      top: overrideStyles.position.y,
      right: undefined,
      bottom: undefined,
    };
  }
  
  return { textStyle: style, position };
};