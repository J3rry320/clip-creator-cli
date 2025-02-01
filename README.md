# Clip-Creator CLI

![Clip-Creator CLI](https://i.postimg.cc/jqHVVMb7/Clip-Creator.png)

A powerful command-line interface tool for creating engaging video clips with AI-generated scripts and amazing free-to-use media. This tool leverages multiple APIs to generate high-quality content across various categories and tones.

![npm](https://img.shields.io/npm/v/clip-creator)  ![npm bundle size](https://img.shields.io/bundlephobia/min/clip-creator)
![downloads](https://img.shields.io/npm/dt/clip-creator?color=green&label=downloads&logo=npm)
  ![stars](https://img.shields.io/github/stars/J3rry320/clip-creator?color=brightgreen&label=stars&logo=github)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Code Coverage](https://img.shields.io/badge/Coverage-53.45%25-yellow)
![Contributors](https://img.shields.io/github/contributors/J3rry320/clip-creator) 
![GitHub issues](https://img.shields.io/github/issues/J3rry320/clip-creator)  

> **Note**: This project is currently a Proof of Concept (POC) and is actively being developed. Expect more features and improvements in future releases.


## Features

Create amazing videos effortlessly with just a few inputs! Leveraging the power of LLM's and open source free-to-use media, Clip Creator CLI enables you to generate captivating content for social media and beyond. Here’s what you can expect:

-   **AI-Powered Script Generation**: Utilize the **llama3-70b-8192** model via GROQ to automatically generate engaging scripts for your videos. No need to brainstorm – let AI handle the creative process.
    
-   **Automated Video Creation**: Customize parameters to create videos tailored to your needs. From length to style, you have full control over the end product, all with minimal effort.
    
-   **Diverse Content Categories and Tones**: Choose from multiple content categories and tones to match your message. Whether it’s educational, entertaining, or promotional, Clip Creator CLI adapts to your requirements.
    
-   **High-Quality Audio**: Integrate high-quality audio tracks from FreeSound to enhance your videos. Perfect for background music, sound effects, or voiceovers.
    
-   **High-Definition Visuals**: Access a vast library of high-definition visuals from Pexels. Ensure your videos are visually stunning with top-notch imagery.
    
-   **Fact-Checking Support**: Maintain credibility and accuracy with built-in fact-checking support. Ensure that your content is reliable and trustworthy.
    
-   **User-Friendly Web Interface**: Enjoy a seamless user experience with our intuitive web interface. Easily navigate through the creation process and make adjustments on the fly.
    

With Clip Creator CLI, you can effortlessly produce professional-quality videos that captivate your audience and elevate your social media presence. Let AI handle the heavy lifting while you focus on creating impactful content.

## Prerequisites
Before using Clip Creator CLI, ensure you have the following:

1.  **Node.js** (v14 or higher)
    
2.  **Package Manager**: Either `npm` or `yarn`
    
3.  **API Keys**: Obtain keys from the following services:
    
    -   **GROQ API**
        
    -   **FreeSound**
        
    -   **Pexels**
        
4.  **FFmpeg**: Required for video processing.
    

### Installing FFmpeg

Follow these steps to install FFmpeg on your system:

#### On macOS:

1.  **Using Homebrew**: 
    
    ```bash
    brew install ffmpeg
    ```
    

#### On Windows:

1.  **Using Windows Subsystem for Linux (WSL)**:
    
    -   Install WSL from the Microsoft Store.
        
    -   Open a WSL terminal and run:
                 
        ```bash
        sudo apt update
        sudo apt install ffmpeg    
        ```
        
2.  **Manual Installation**:
    
    -   Download the FFmpeg executable from FFmpeg website.
        
    -   Extract the files and add the FFmpeg bin directory to your system's PATH.
        

#### On Linux:

1.  **Using APT (Debian/Ubuntu)**:
    
    ```bash
    sudo apt update
    sudo apt install ffmpeg 
    ```
    
2.  **Using DNF (Fedora)**:
    
    ```bash
    sudo dnf install ffmpeg  
    ```   

After setting up these prerequisites, you’ll be ready to use Clip Creator CLI.
## Installation

Install globally via npm:
```bash
npm install -g clip-creator
```
Or yarn 
```bash
yarn global add clip-creator
```
Or use with npx:
```bash
npx clip-creator [command]
```

For development:
```bash
git clone https://github.com/j3rry320/clip-creator
cd clip-creator
npm install
node clip-creator bin/cli.js
```

## Getting API Keys

### GROQ API Key
1. Visit [GROQ's website](https://groq.com)
2. Create an account or sign in
3. Navigate to the API section
4. Generate a new API key

### FreeSound API Key
1. Go to [FreeSound](https://freesound.org)
2. Register for an account
3. Visit your profile settings
4. Navigate to the API credentials section
5. Create a new API key

### Pexels API Key
1. Visit [Pexels](https://www.pexels.com/api)
2. Sign up for a developer account
3. Once approved, you'll receive your API key

## Usage

### Command Line Interface
1. Create a new video (Interactive)
```bash
clip-creator create
```
2. Basic video creation with default (required) configuration:
```bash
clip-creator create \
  --freeSoundKey YOUR_FREESOUND_KEY \
  --groqKey YOUR_GROQ_KEY \
  --pexelsKey YOUR_PEXELS_KEY \
  --category Educational \
  --tone Professional \
  --topic "AI Technology" \
  --duration 30
```

3. List available categories:
```bash
clip-creator list-categories -v
```

4. List available tones:
```bash
clip-creator list-tones -v
```

### Web Interface

Start the web interface:
```bash
clip-creator web --port 3003
```
After running the above command, open your browser and navigate to http://localhost:3003/index.html to access the clean and user-friendly web-based UI. Enjoy a seamless experience in creating and managing your video clips through an intuitive interface.



## Configuration  

You can create a JSON configuration file to store API keys, default settings or advance settings:

  

```json
 {
  "freeSoundApiKey": "your-key",
  "groqApiKey": "your-key",
  "pexelsApiKey": "your-key",
  "category": "Educational",
  "tone": "Professional",
  "topic": "Rise of AI",
  "duration": 30,
  "factChecking": true,
  "outputDir": "./videos",
  "fontSize": 24,
  "font": "Arial",
  "fps": 30,
  "height": 1080,
  "width": 1920,
  "volume": 0.8,
  "fadeInDuration": 2,
  "fadeOutDuration": 2
}
```

Use the config file:
```bash
clip-creator create --config path/to/config.json
```
> Don't worry, Whatever key you don't provide in the config file will be asked again in the interactive prompt

## Default Options
**These fields are required**
You need to provide these configurations for the tool to function properly:

### --freeSoundApiKey
- **Description:** Specifies your API key for accessing FreeSound. This key allows you to integrate high-quality audio tracks into your video projects.
- **Example Usage:** `"freeSoundApiKey": "your-key"`

### --groqApiKey
- **Description:** Specifies your API key for accessing GROQ. This key is used for AI-powered script generation to create engaging video content.
- **Example Usage:** `"groqApiKey": "your-key"`

### --pexelsApiKey
- **Description:** Specifies your API key for accessing Pexels. This key provides access to high-definition visuals to enhance your videos.
- **Example Usage:** `"pexelsApiKey": "your-key"`

### --category
- **Description:** Defines the content category for the video. This option helps tailor the video to specific subject areas or themes.
- **Example Usage:** `"category": "Educational"`

### --tone
- **Description:** Specifies the tone of the video. This option allows you to set the overall style and mood of the content.
- **Example Usage:** `"tone": "Professional"`

### --topic
- **Description:** Defines the main topic of the video. This option guides the content creation process to focus on the specified subject.
- **Example Usage:** `"topic": "Rise of AI"`

### --duration
- **Description:** Sets the duration of the video in seconds. This option allows you to control the length of the final output.
- **Example Usage:** `"duration": 30`

## Advanced Options
**These fields are optional**
You can configure these options for a more refined output (not required by default) 

- **--keyTerms**
  - Description: Specifies the key terms that must be included in the generated content.
  - Example Usage: `--keyTerms "environment, sustainability"`

- **--requireFactChecking**
  - Description: Enables fact-checking to ensure that the content is accurate and reliable.
  - Example Usage: `--requireFactChecking true`

- **--outputDir**
  - Description: Specifies the custom directory where the output files will be saved.
  - Example Usage: `--outputDir "/path/to/directory"`

- **--fontSize**
  - Description: Sets the text size in the generated video.
  - Example Usage: `--fontSize 24`

- **--font**
  - Description: Specifies the custom font file to be used for text in the video.
  - Example Usage: `--font "/path/to/font.ttf"`

- **--fps**
  - Description: Sets the frames per second for the video.
  - Example Usage: `--fps 30`

- **--height**
  - Description: Specifies the height of the video in pixels. Also used to search Pexels. Use traditional values to avoid search failures.
  - Example Usage: `--height 1080`

- **--width**
  - Description: Specifies the width of the video in pixels. Also used to search Pexels. Use traditional values to avoid search failures.
  - Example Usage: `--width 1920`

- **--volume**
  - Description: Adjusts the audio volume of the video.
  - Example Usage: `--volume 75`

- **--fadeInDuration**
  - Description: Sets the duration for the fade-in effect at the beginning of the video, in seconds.
  - Example Usage: `--fadeInDuration 2`

- **--fadeOutDuration**
  - Description: Sets the duration for the fade-out effect at the end of the video, in seconds.
  - Example Usage: `--fadeOutDuration 2`

## Roadmap


### Short-term Goals (Q1 2025)
-   [ ] Implement batch processing

-   [ ] Add more fonts and implement multiple text transformation

-   [ ] Add more ways for the user to configure the LLM API

-   [ ] Add more media providers for better and diverse end result

-   [ ] Enhance user interface for better accessibility
    
-   [ ] Introduce customizable themes and layouts
    
-   [ ] Develop a user feedback system

-   [ ] Integrate some ML functionality with the feedback for better generation capabilities?
    
-   [ ] Optimize video rendering speed
    
-   [ ] Add support for custom audio tracks
    

### Mid-term Goals (Q2-Q3 2025)

    
-   [ ] Add more content categories and tones
    
-   [ ] Improve error handling and recovery
    
-   [ ] Integrate with popular social media platforms for easy sharing
    
-   [ ] Add automated subtitle generation
    
-   [ ] Introduce a collaboration workspace for team projects
    
-   [ ] Enhance security features and data privacy measures
    
-   [ ] Create mobile app for on-the-go editing?
    

### Long-term Goals (Q4 2025 and Beyond)

-   [ ] Add AI-powered video editing capabilities

-   [ ] Have options for the user to run with local LLM's for better privacy and offline functionality

-   [ ] Add compressed video and audio libraries to add offline generation support
    
-   [ ] Implement real-time preview
    
-   [ ] Add collaboration features
    
-   [ ] Create cloud storage integration
    
-   [ ] Add advanced analytics and reporting
    
-   [ ] Implement a template system for quick video creation
    
-   [ ] Develop a comprehensive analytics dashboard
    
-   [ ] Expand support for virtual reality and 360° videos
    
-   [ ] Create a plugin system for extensibility

## Contributing

We welcome contributions! Please feel free to submit a Pull Request. To contribute:

1. Clone the repository:
```bash
git  clone  https://github.com/j3rry320/clip-creator-cli

cd  clip-creator-cli
```
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Added some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Publishing

For maintainers who need to publish updates to npm:

```bash
# Update version in package.json
npm version patch # or minor or major

# Publish to npm
npm publish

# Push tags
git push --tags
```
## Author & Contact

  

This project is actively maintained by **Jerry Satpathy**. I'm currently looking for work and open to opportunities. Feel free to contact me via:

  

- GitHub: [j3rry320](https://github.com/j3rry320)

- Email: rutuparna.satpathy01@gmail.com[mailto:rutuparna.satpathy01@gmail.com]

- LinkedIn: [Jerry Satpathy](https://linkedin.com/in/jerrythejsguy)
## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/j3rry320/clip-creator-cli/blob/main/LICENSE) file for details.

## Support

If you encounter any issues or have questions, please:
1. Check the [Issues](https://github.com/j3rry320/clip-creator-cli/issues) page
2. Create a new issue if your problem isn't already listed
3. For npm-specific issues, check the [npm package page](https://www.npmjs.com/package/clip-creator-cli)

## Acknowledgments

- Thanks to GROQ for the LLM API
- Thanks to FreeSound for audio content
- Thanks to Pexels for video content

 > **Subnote**: Due to time commitments elsewhere, there is currently limited test case coverage (53%). However, I am actively working on writing more test cases to achieve up to 99% coverage.