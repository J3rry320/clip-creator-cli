# Clip-Creator CLI

![Clip-Creator CLI](https://i.postimg.cc/jqHVVMb7/Clip-Creator.png)

A powerful command-line interface tool for creating engaging video clips with AI-generated scripts and amazing free-to-use media. This tool leverages multiple APIs to generate high-quality content across various categories and tones.

![npm](https://img.shields.io/npm/v/clip-creator)  ![npm bundle size](https://img.shields.io/bundlephobia/min/clip-creator)
![downloads](https://img.shields.io/npm/dt/clip-creator?color=green&label=downloads&logo=npm)
  ![stars](https://img.shields.io/github/stars/J3rry320/clip-creator-cli?color=brightgreen&label=stars&logo=github)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Code Coverage](https://img.shields.io/badge/Coverage-60.85%25-yellow)
![Contributors](https://img.shields.io/github/contributors/J3rry320/clip-creator-cli) 
![GitHub issues](https://img.shields.io/github/issues/J3rry320/clip-creator-cli)  

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

- **Supports Single and Batch Processing of Videos**:  Whether you're creating a single video or generating multiple videos from the same input, our system ensures smooth and timely processing. Perfect for creators and businesses needing to produce multiple videos seamlessly and efficiently.    

**With Clip Creator CLI, you can effortlessly produce professional-quality videos that captivate your audience and elevate your social media presence. Let AI handle the heavy lifting while you focus on creating impactful content.**

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
git clone https://github.com/j3rry320/clip-creator-cli
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

## `batch-process`

Create multiple video clips in parallel using the same configuration settings.

#### Usage

```bash
clip-creator batch-process --count 10 --maxConcurrent 4 --topic "Optical Character Recognition" --duration 20 --config /path/to/config.json
```

#### Options

-   `--count <number>`: Number of videos to generate
    
-   `--maxConcurrent <number>`: Maximum number of concurrent processes (defaults to CPU cores - 1)
    
-   `--printStatus`: Print the current status of the videos being processed
    
-   Any options available in `create` can also be passed to `batch-process`. (You Need to pass the required config to batch-process command as well)


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
  "font": "/path/to/fontfile.ttf",
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

**These fields are required** You need to provide these configurations for the tool to function properly:

### --freeSoundApiKey

-   **Description:** Specifies your API key for accessing FreeSound. This key allows you to integrate high-quality audio tracks into your video projects.
    
-   **Example Usage:**
    
    -   CLI: `--freeSoundKey "your-key"`
        
    -   JSON: `"freeSoundApiKey": "your-key"`
        

### --groqApiKey

-   **Description:** Specifies your API key for accessing GROQ. This key is used for AI-powered script generation to create engaging video content.
    
-   **Example Usage:**
    
    -   CLI: `--groqKey "your-key"`
        
    -   JSON: `"groqApiKey": "your-key"`
        

### --pexelsApiKey

-   **Description:** Specifies your API key for accessing Pexels. This key provides access to high-definition visuals to enhance your videos.
    
-   **Example Usage:**
    
    -   CLI: `--pexelsKey "your-key"`
        
    -   JSON: `"pexelsApiKey": "your-key"`
        

### --category

-   **Description:** Defines the content category for the video. This option helps tailor the video to specific subject areas or themes.
    
-   **Example Usage:**
    
    -   CLI: `--category "Educational"`
        
    -   JSON: `"category": "Educational"`
        

### --tone

-   **Description:** Specifies the tone of the video. This option allows you to set the overall style and mood of the content.
    
-   **Example Usage:**
    
    -   CLI: `--tone "Professional"`
        
    -   JSON: `"tone": "Professional"`
        

### --topic

-   **Description:** Defines the main topic of the video. This option guides the content creation process to focus on the specified subject.
    
-   **Example Usage:**
    
    -   CLI: `--topic "Rise of AI"`
        
    -   JSON: `"topic": "Rise of AI"`
        

### --duration

-   **Description:** Sets the duration of the video in seconds. This option allows you to control the length of the final output.
    
-   **Example Usage:**
    
    -   CLI: `--duration 30`
        
    -   JSON: `"duration": 30`
        

## Advanced Options

**These fields are optional** You can configure these options for a more refined output (not required by default)

### --keyTerms

-   **Description:** Specifies the key terms that must be included in the generated content.
    
-   **Example Usage:**
    
    -   CLI: `--keyTerms "environment, sustainability"`
        
    -   JSON: `"keyTerms": "environment, sustainability"`
        

### --requireFactChecking

-   **Description:** Enables fact-checking to ensure that the content is accurate and reliable.
    
-   **Example Usage:**
    
    -   CLI: `--requireFactChecking true`
        
    -   JSON: `"requireFactChecking": true`
        

### --outputDir

-   **Description:** Specifies the custom directory where the output files will be saved.
    
-   **Example Usage:**
    
    -   CLI: `--outputDir "/path/to/directory/fontfile.ttf"`
        
    -   JSON: `"outputDir": "/path/to/directory/fontfile.ttf"`
        

### --fontSize

-   **Description:** Sets the text size in the generated video.
    
-   **Example Usage:**
    
    -   CLI: `--fontSize 24`
        
    -   JSON: `"fontSize": 24`
        

### --font

-   **Description:** Specifies the custom font file to be used for text in the video.
    
-   **Example Usage:**
    
    -   CLI: `--font "/path/to/font.ttf"`
        
    -   JSON: `"font": "/path/to/font.ttf"`
        

### --fps

-   **Description:** Sets the frames per second for the video. Range (0-60)
    
-   **Example Usage:**
    
    -   CLI: `--fps 30`
        
    -   JSON: `"fps": 30`
        

### --height

-   **Description:** Specifies the height of the video in pixels. Also used to search Pexels. Use traditional values to avoid search failures.
    
-   **Example Usage:**
    
    -   CLI: `--height 1080`
        
    -   JSON: `"height": 1080"`
        

### --width

-   **Description:** Specifies the width of the video in pixels. Also used to search Pexels. Use traditional values to avoid search failures.
    
-   **Example Usage:**
    
    -   CLI: `--width 1920`
        
    -   JSON: `"width": 1920"`
        

### --volume

-   **Description:** Adjusts the audio volume of the video. Range (0-1) 
    
-   **Example Usage:**
    
    -   CLI: `--volume 0.75`
        
    -   JSON: `"volume": 0.75`
        

### --fadeInDuration

-   **Description:** Sets the duration for the fade-in effect at the beginning of the video, in seconds. Range (0-5)
    
-   **Example Usage:**
    
    -   CLI: `--fadeInDuration 2`
        
    -   JSON: `"fadeInDuration": 2`
        

### --fadeOutDuration

-   **Description:** Sets the duration for the fade-out effect at the end of the video, in seconds. Range (0-5)
    
-   **Example Usage:**
    
    -   CLI: `--fadeOutDuration 2`
        
    -   JSON: `"fadeOutDuration": 2`

## Usage Limits

This document outlines the usage limits for the Clip-Creator CLI, based on the rate limits of the underlying APIs it utilizes.  Understanding these limits is crucial for planning your video creation workflow.

**Important Note:** The creation of a single video requires all three APIs (Pexels, FreeSound, and GROQ). Therefore, the API with the *most restrictive limit* at any given time will determine your overall video creation capacity.

### API Rate Limits and Video Capacity

Here's a breakdown of each API's rate limits and how they translate to video creation capacity:

#### 1. Pexels API

*   **Rate Limit:** 20,000 requests per month
*   **Usage per video:** 1-12 requests
*   **Monthly Video Capacity:**
    *   **Minimum:** 1,667 videos (20,000 requests / 12 requests/video)
    *   **Maximum:** 20,000 videos (20,000 requests / 1 request/video)

#### 2. FreeSound API

*   **Rate Limit:** 60,000 requests per month (2,000 requests/day * 30 days/month)
*   **Usage per video:** 1-2 requests
*   **Monthly Video Capacity:**
    *   **Minimum:** 30,000 videos (60,000 requests / 2 requests/video)
    *   **Maximum:** 60,000 videos (60,000 requests / 1 request/video)

#### 3. GROQ API

*   **Rate Limit:** 15,000,000 tokens per month (500,000 tokens/day * 30 days/month)
*   **Usage per video:** 1,000-1,200 tokens
*   **Monthly Video Capacity:**
    *   **Minimum:** 12,500 videos (15,000,000 tokens / 1,200 tokens/video)
    *   **Maximum:** 15,000 videos (15,000,000 tokens / 1,000 tokens/video)

### Overall Video Creation Capacity

Because all three APIs are necessary for video creation, your actual capacity is limited by the *most restrictive* API.  In this case:

*   **Minimum Possible Videos per Month:** 1,667 (limited by Pexels)
*   **Maximum Possible Videos per Month:** 15,000 (limited by GROQ)

Therefore, you can create between **1,667 and 15,000 videos per month**.

### Important Considerations

*   **Variable API Usage:** The actual number of videos you can create depends on the specific number of requests/tokens used *per video*.  If your videos tend to use more Pexels requests or GROQ tokens, your capacity will be closer to the minimum.  Conversely, if your videos are optimized to use fewer requests/tokens, you'll be closer to the maximum.
*   **Combined Limits:**  It's crucial to remember that these limits are *combined*. Even if FreeSound allows for more videos, you're still limited by Pexels and GROQ.
*   **Monitoring Usage:** It's recommended to monitor your API usage to avoid hitting rate limits unexpectedly.  This can often be done through the API provider's developer console or by tracking your CLI's API calls.
*   **Future Changes:** API rate limits are subject to change.  Refer to the respective API documentation for the most up-to-date information.

> This information should help you plan your video creation projects effectively. If you have any questions, please contact support
## Roadmap


### Short-term Goals (Q1 2025)
-   [X] Implement batch processing

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

 > **Subnote**: Due to time commitments elsewhere, there is currently limited test case coverage (60.85%). However, I am actively working on writing more test cases to achieve up to 99% coverage.

 <a href="https://www.producthunt.com/posts/clip-creator-cli?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-clip&#0045;creator&#0045;cli" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=840186&theme=dark&t=1738479822217" alt="Clip&#0045;Creator&#0032;CLI - Automate&#0032;your&#0032;video&#0032;creation&#0032;effortlessly&#0033; | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>