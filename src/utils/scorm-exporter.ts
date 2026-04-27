import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Course, ScormVersion, Slide } from '../types';

function getAllSlides(course: Course): { slide: Slide; moduleTitle: string; lessonTitle: string }[] {
  const slides: { slide: Slide; moduleTitle: string; lessonTitle: string }[] = [];
  course.modules.forEach(mod => {
    mod.lessons.forEach(lesson => {
      lesson.slides.forEach(slide => {
        slides.push({ slide, moduleTitle: mod.title, lessonTitle: lesson.title });
      });
    });
  });
  return slides;
}

function generateManifest12(course: Course): string {
  const identifier = `course_${course.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${identifier}"
  version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
    http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
    http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
    <lom xmlns="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1">
      <general>
        <title><langstring xml:lang="${course.language}">${escapeXml(course.title)}</langstring></title>
        <description><langstring xml:lang="${course.language}">${escapeXml(course.description)}</langstring></description>
      </general>
    </lom>
  </metadata>
  <organizations default="org_1">
    <organization identifier="org_1">
      <title>${escapeXml(course.title)}</title>
      <item identifier="item_1" identifierref="res_1">
        <title>${escapeXml(course.title)}</title>
        <adlcp:masteryscore>${course.settings.passingScore}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_1" type="webcontent" adlcp:scormtype="sco" href="content/index.html">
      <file href="content/index.html"/>
      <file href="content/scorm-api.js"/>
      <file href="content/course-data.js"/>
      <file href="content/player.js"/>
      <file href="content/styles.css"/>
    </resource>
  </resources>
</manifest>`;
}

function generateManifest2004(course: Course): string {
  const identifier = `course_${course.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${identifier}"
  version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
    http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
    http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
    http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd
    http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="org_1">
    <organization identifier="org_1">
      <title>${escapeXml(course.title)}</title>
      <item identifier="item_1" identifierref="res_1">
        <title>${escapeXml(course.title)}</title>
        <imsss:sequencing>
          <imsss:deliveryControls completionSetByContent="true" objectiveSetByContent="true"/>
        </imsss:sequencing>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_1" type="webcontent" adlcp:scormType="sco" href="content/index.html">
      <file href="content/index.html"/>
      <file href="content/scorm-api.js"/>
      <file href="content/course-data.js"/>
      <file href="content/player.js"/>
      <file href="content/styles.css"/>
    </resource>
  </resources>
</manifest>`;
}

function generateScormApi12(): string {
  return `// SCORM 1.2 API Wrapper
var ScormAPI = (function() {
  var api = null;
  var initialized = false;

  function findAPI(win) {
    var attempts = 0;
    while (win && !win.API && attempts < 10) {
      if (win.parent && win.parent !== win) {
        win = win.parent;
      } else if (win.opener) {
        win = win.opener;
      } else {
        break;
      }
      attempts++;
    }
    return win ? win.API : null;
  }

  function init() {
    api = findAPI(window);
    if (api) {
      var result = api.LMSInitialize("");
      initialized = (result === "true" || result === true);
      if (initialized) {
        api.LMSSetValue("cmi.core.lesson_status", "incomplete");
        api.LMSCommit("");
      }
    }
    return initialized;
  }

  function getValue(key) {
    if (!api || !initialized) return "";
    return api.LMSGetValue(key);
  }

  function setValue(key, value) {
    if (!api || !initialized) return false;
    var result = api.LMSSetValue(key, String(value));
    return (result === "true" || result === true);
  }

  function commit() {
    if (!api || !initialized) return false;
    return api.LMSCommit("");
  }

  function finish(status) {
    if (!api || !initialized) return;
    if (status) {
      api.LMSSetValue("cmi.core.lesson_status", status);
    }
    api.LMSCommit("");
    api.LMSFinish("");
    initialized = false;
  }

  function setScore(score, min, max) {
    setValue("cmi.core.score.raw", score);
    setValue("cmi.core.score.min", min || 0);
    setValue("cmi.core.score.max", max || 100);
  }

  function setBookmark(location) {
    setValue("cmi.core.lesson_location", location);
    commit();
  }

  function getBookmark() {
    return getValue("cmi.core.lesson_location");
  }

  function setSuspendData(data) {
    setValue("cmi.suspend_data", data);
    commit();
  }

  function getSuspendData() {
    return getValue("cmi.suspend_data");
  }

  function setSessionTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    var timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    setValue("cmi.core.session_time", timeStr);
  }

  return {
    init: init,
    getValue: getValue,
    setValue: setValue,
    commit: commit,
    finish: finish,
    setScore: setScore,
    setBookmark: setBookmark,
    getBookmark: getBookmark,
    setSuspendData: setSuspendData,
    getSuspendData: getSuspendData,
    setSessionTime: setSessionTime
  };
})();
`;
}

function generateScormApi2004(): string {
  return `// SCORM 2004 API Wrapper
var ScormAPI = (function() {
  var api = null;
  var initialized = false;

  function findAPI(win) {
    var attempts = 0;
    while (win && !win.API_1484_11 && attempts < 10) {
      if (win.parent && win.parent !== win) {
        win = win.parent;
      } else if (win.opener) {
        win = win.opener;
      } else {
        break;
      }
      attempts++;
    }
    return win ? win.API_1484_11 : null;
  }

  function init() {
    api = findAPI(window);
    if (api) {
      var result = api.Initialize("");
      initialized = (result === "true" || result === true);
      if (initialized) {
        api.SetValue("cmi.completion_status", "incomplete");
        api.SetValue("cmi.success_status", "unknown");
        api.Commit("");
      }
    }
    return initialized;
  }

  function getValue(key) {
    if (!api || !initialized) return "";
    return api.GetValue(key);
  }

  function setValue(key, value) {
    if (!api || !initialized) return false;
    var result = api.SetValue(key, String(value));
    return (result === "true" || result === true);
  }

  function commit() {
    if (!api || !initialized) return false;
    return api.Commit("");
  }

  function finish(status) {
    if (!api || !initialized) return;
    if (status === "passed" || status === "failed") {
      api.SetValue("cmi.success_status", status);
      api.SetValue("cmi.completion_status", "completed");
    } else if (status === "completed") {
      api.SetValue("cmi.completion_status", "completed");
    }
    api.Commit("");
    api.Terminate("");
    initialized = false;
  }

  function setScore(score, min, max) {
    setValue("cmi.score.raw", score);
    setValue("cmi.score.min", min || 0);
    setValue("cmi.score.max", max || 100);
    setValue("cmi.score.scaled", score / (max || 100));
  }

  function setBookmark(location) {
    setValue("cmi.location", location);
    commit();
  }

  function getBookmark() {
    return getValue("cmi.location");
  }

  function setSuspendData(data) {
    setValue("cmi.suspend_data", data);
    commit();
  }

  function getSuspendData() {
    return getValue("cmi.suspend_data");
  }

  function setSessionTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    var timeStr = 'PT' + h + 'H' + m + 'M' + s + 'S';
    setValue("cmi.session_time", timeStr);
  }

  function setProgressMeasure(value) {
    var clamped = Math.min(1, Math.max(0, value));
    setValue("cmi.progress_measure", clamped.toFixed(4));
  }

  return {
    init: init,
    getValue: getValue,
    setValue: setValue,
    commit: commit,
    finish: finish,
    setScore: setScore,
    setBookmark: setBookmark,
    getBookmark: getBookmark,
    setSuspendData: setSuspendData,
    getSuspendData: getSuspendData,
    setSessionTime: setSessionTime,
    setProgressMeasure: setProgressMeasure
  };
})();
`;
}

function generateCourseData(course: Course): string {
  const slides = getAllSlides(course);
  const sanitized = {
    title: course.title,
    description: course.description,
    author: course.author,
    version: course.version,
    language: course.language,
    settings: course.settings,
    modules: course.modules.map(mod => ({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      thumbnail: mod.thumbnail,
      color: mod.color || '',
      lessonCount: mod.lessons.length,
      slideCount: mod.lessons.reduce((t, l) => t + l.slides.length, 0),
      duration: mod.lessons.reduce(
        (t, l) => t + l.slides.reduce((st, s) => st + s.duration, 0), 0
      ),
    })),
    slides: slides.map(s => ({
      title: s.slide.title,
      layout: s.slide.layout,
      backgroundColor: s.slide.backgroundColor,
      backgroundImage: s.slide.backgroundImage,
      moduleTitle: s.moduleTitle,
      lessonTitle: s.lessonTitle,
      content: s.slide.content,
      questions: s.slide.questions,
      duration: s.slide.duration,
      transition: s.slide.transition,
      isCoverSlide: s.slide.isCoverSlide,
      coverSubtitle: s.slide.coverSubtitle,
      learningObjectives: s.slide.learningObjectives,
      fullBleed: s.slide.fullBleed,
    })),
  };
  return `var COURSE_DATA = ${JSON.stringify(sanitized, null, 2)};`;
}

function generatePlayer(): string {
  return `// Course Player
(function() {
  var currentSlide = 0;
  var totalSlides = COURSE_DATA.slides.length;
  var quizAnswers = {};
  var submittedQuizzes = {};
  var visitedSlides = new Set();
  var startTime = new Date();

  var showingLanding = false;
  var isNarrating = false;

  function extractSlideText(slide) {
    var parts = [];
    if (slide.title) parts.push(slide.title);
    if (slide.learningObjectives && slide.learningObjectives.length > 0) {
      parts.push('Learning objectives.');
      slide.learningObjectives.forEach(function(obj) {
        if (obj.text) parts.push(obj.text);
      });
    }
    if (slide.content) {
      slide.content.forEach(function(block) {
        if (block.content) {
          var text = block.content.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();
          if (text) parts.push(text);
        }
      });
    }
    if (slide.questions) {
      slide.questions.forEach(function(q) {
        if (q.text) parts.push(q.text);
      });
    }
    return parts.join('. ');
  }

  function startNarration() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var slide = COURSE_DATA.slides[currentSlide];
    if (!slide) return;
    var text = extractSlideText(slide);
    if (!text) return;
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = COURSE_DATA.language || 'en';
    utterance.onend = function() {
      isNarrating = false;
      updateNarrationButton();
    };
    window.speechSynthesis.speak(utterance);
    isNarrating = true;
    updateNarrationButton();
  }

  function stopNarration() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    isNarrating = false;
    updateNarrationButton();
  }

  function updateNarrationButton() {
    var btn = document.getElementById('btn-narrate');
    if (!btn) return;
    if (isNarrating) {
      btn.classList.add('narrating');
      btn.title = 'Stop narration';
      btn.innerHTML = '\\u{1F507}';
    } else {
      btn.classList.remove('narrating');
      btn.title = 'Read aloud';
      btn.innerHTML = '\\u{1F50A}';
    }
  }

  window._toggleNarration = function() {
    if (isNarrating) {
      stopNarration();
    } else {
      startNarration();
    }
  };

  function goToSlide(index) {
    currentSlide = index;
    showingLanding = false;
    var body = document.getElementById('body');
    var header = document.getElementById('header');
    var progress = document.getElementById('progress-container');
    if (body) body.style.display = '';
    if (header) header.style.display = '';
    if (progress) progress.style.display = '';
    var landingEl = document.getElementById('landing-page');
    if (landingEl) landingEl.style.display = 'none';
    renderSlide();
    renderSidebar();
    updateProgress();
    updateNavigation();
    saveState();
    if (isNarrating) startNarration();
  }

  function getModuleFirstSlideIndex(moduleIdx) {
    var idx = 0;
    for (var i = 0; i < moduleIdx && i < COURSE_DATA.modules.length; i++) {
      idx += COURSE_DATA.modules[i].slideCount;
    }
    return idx;
  }

  function formatDuration(seconds) {
    if (seconds < 60) return seconds + 's';
    var minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + ' min';
    var hours = Math.floor(minutes / 60);
    var remaining = minutes % 60;
    return remaining > 0 ? hours + 'h ' + remaining + 'm' : hours + 'h';
  }

  function renderLandingPage() {
    showingLanding = true;
    var lp = COURSE_DATA.settings.landingPage;
    var primaryColor = COURSE_DATA.settings.primaryColor || '#6366f1';
    var textColor = lp.textColor || '#ffffff';

    // Hide the normal player UI
    var body = document.getElementById('body');
    var progress = document.getElementById('progress-container');
    var header = document.getElementById('header');
    if (body) body.style.display = 'none';
    if (progress) progress.style.display = 'none';
    if (header) header.style.display = 'none';

    // Create or show landing page element
    var landingEl = document.getElementById('landing-page');
    if (!landingEl) {
      landingEl = document.createElement('div');
      landingEl.id = 'landing-page';
      document.body.appendChild(landingEl);
    }
    landingEl.style.display = '';

    var totalSlideCount = COURSE_DATA.slides.length;
    var totalQuestionCount = 0;
    COURSE_DATA.slides.forEach(function(s) {
      if (s.questions) totalQuestionCount += s.questions.length;
    });

    // Left panel background style
    var leftStyle = '';
    if (lp.heroImageUrl) {
      leftStyle = 'background-image:url(' + lp.heroImageUrl + ');background-size:cover;background-position:center;';
    } else if (lp.backgroundGradient) {
      leftStyle = 'background:' + lp.backgroundGradient + ';';
    } else {
      leftStyle = 'background-color:' + (lp.backgroundColor || '#1e1b4b') + ';';
    }

    var placeholderColors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

    var html = '<div class="landing-page" style="' + leftStyle + '">';

    // === LEFT HERO PANEL ===
    html += '<div class="landing-hero">';
    if (lp.heroImageUrl) {
      html += '<div class="landing-hero-overlay" style="background-color:' + (lp.backgroundColor || '#1e1b4b') + ';opacity:0.82;"></div>';
    }
    html += '<div class="landing-hero-inner">';

    // Logo
    if (COURSE_DATA.settings.logoUrl) {
      html += '<div class="landing-logo"><img src="' + COURSE_DATA.settings.logoUrl + '" alt="Logo" class="landing-logo-img"/></div>';
    }

    // Center content
    html += '<div class="landing-center">';
    html += '<h1 class="landing-title" style="color:' + textColor + ';">' + escapeHtml(COURSE_DATA.title) + '</h1>';

    if (lp.tagline) {
      html += '<p class="landing-tagline" style="color:' + textColor + ';">' + escapeHtml(lp.tagline) + '</p>';
    } else if (COURSE_DATA.description) {
      html += '<p class="landing-tagline" style="color:' + textColor + ';opacity:0.7;">' + escapeHtml(COURSE_DATA.description) + '</p>';
    }

    // Stats row
    html += '<div class="landing-stats" style="color:' + textColor + ';">';
    html += '<span>' + COURSE_DATA.modules.length + ' module' + (COURSE_DATA.modules.length !== 1 ? 's' : '') + '</span>';
    html += '<span>' + totalSlideCount + ' slide' + (totalSlideCount !== 1 ? 's' : '') + '</span>';
    if (totalQuestionCount > 0) {
      html += '<span>' + totalQuestionCount + ' question' + (totalQuestionCount !== 1 ? 's' : '') + '</span>';
    }
    html += '</div>';

    // Progress bar
    if (lp.showProgress) {
      var completionPercent = totalSlideCount > 0 ? Math.round((visitedSlides.size / totalSlideCount) * 100) : 0;
      html += '<div class="landing-progress">';
      html += '<span class="landing-progress-label" style="color:' + textColor + ';">You completed ' + completionPercent + '%</span>';
      html += '<div class="landing-progress-track" style="background:' + textColor + '20;">';
      html += '<div class="landing-progress-fill" style="width:' + completionPercent + '%;background:' + primaryColor + ';"></div>';
      html += '</div></div>';
    }

    // Start button
    html += '<button class="landing-start-btn" style="background:' + primaryColor + ';" onclick="window._startCourse()">&#9654; Start Course</button>';
    html += '</div>';

    // Company branding
    if ((lp.showCompanyLogo && lp.companyLogoUrl) || lp.companyName) {
      html += '<div class="landing-company">';
      if (lp.showCompanyLogo && lp.companyLogoUrl) {
        html += '<img src="' + lp.companyLogoUrl + '" alt="Company" class="landing-company-logo"/>';
      }
      if (lp.companyName) {
        html += '<span class="landing-company-name" style="color:' + textColor + ';">' + escapeHtml(lp.companyName) + '</span>';
      }
      html += '</div>';
    }

    html += '</div>';
    html += '</div>';

    // === RIGHT MODULE LIST PANEL ===
    html += '<div class="landing-modules">';
    html += '<div class="landing-modules-header">';
    html += '<h2>Course Content</h2>';
    html += '<p>' + COURSE_DATA.modules.length + ' module' + (COURSE_DATA.modules.length !== 1 ? 's' : '') +
      ' \\u00b7 ' + totalSlideCount + ' slide' + (totalSlideCount !== 1 ? 's' : '') +
      (totalQuestionCount > 0 ? ' \\u00b7 ' + totalQuestionCount + ' question' + (totalQuestionCount !== 1 ? 's' : '') : '') +
      '</p>';
    html += '</div>';

    html += '<div class="landing-modules-list">';
    COURSE_DATA.modules.forEach(function(mod, idx) {
      var color = mod.color || placeholderColors[idx % placeholderColors.length];
      html += '<button class="module-card" onclick="window._jumpToModule(' + idx + ')">';
      html += '<div class="module-card-inner">';

      // Thumbnail
      html += '<div class="module-card-thumb">';
      if (mod.thumbnail) {
        html += '<img src="' + escapeHtml(mod.thumbnail) + '" alt="' + escapeHtml(mod.title) + '" class="module-card-thumb-img"/>';
      } else {
        html += '<div class="module-card-thumb-placeholder" style="background:' + color + ';">&#x1F4D6;</div>';
      }
      html += '<div class="module-card-badge">' + String(idx + 1).padStart(2, '0') + '</div>';
      html += '</div>';

      // Content
      html += '<div class="module-card-content">';
      html += '<h3 class="module-card-title">' + escapeHtml(mod.title) + '</h3>';
      if (mod.description) {
        html += '<p class="module-card-desc">' + escapeHtml(mod.description) + '</p>';
      }
      html += '<div class="module-card-meta">';
      html += '<span>' + mod.lessonCount + ' lesson' + (mod.lessonCount !== 1 ? 's' : '') + '</span>';
      html += '<span>' + mod.slideCount + ' slide' + (mod.slideCount !== 1 ? 's' : '') + '</span>';
      if (mod.duration > 0) {
        html += '<span>' + formatDuration(mod.duration) + '</span>';
      }
      html += '</div>';
      html += '</div>';

      html += '</div>';
      html += '</button>';
    });
    html += '</div>';

    html += '<div class="landing-footer">Powered by eLearning Studio</div>';
    html += '</div>';

    landingEl.innerHTML = html;
  }

  window._startCourse = function() {
    goToSlide(0);
  };

  window._jumpToModule = function(moduleIdx) {
    goToSlide(getModuleFirstSlideIndex(moduleIdx));
  };

  window._showLanding = function() {
    if (COURSE_DATA.settings.landingPage && COURSE_DATA.settings.landingPage.enabled) {
      renderLandingPage();
    }
  };

  window._showResults = function() {
    finishCourse();
  };

  // Sidebar rendering
  function renderSidebar() {
    var tree = document.getElementById('sidebar-tree');
    if (!tree) return;

    var flatIndex = 0;
    var html = '';

    COURSE_DATA.modules.forEach(function(mod, modIdx) {
      var moduleStartIdx = flatIndex;
      var moduleEndIdx = flatIndex + mod.slideCount - 1;
      var isCurrentModule = currentSlide >= moduleStartIdx && currentSlide <= moduleEndIdx;
      var sectionOpen = isCurrentModule ? ' open' : '';

      html += '<div class="sidebar-section' + sectionOpen + '" data-module-idx="' + modIdx + '">';
      html += '<button class="sidebar-section-header" data-module-toggle="' + modIdx + '">';
      html += '<div class="sidebar-section-info">';
      html += '<span class="sidebar-section-label">Section ' + (modIdx + 1) + '</span>';
      html += '<span class="sidebar-section-title">' + escapeHtml(mod.title) + '</span>';
      html += '</div>';
      html += '<span class="sidebar-section-arrow">\\u25B6</span>';
      html += '</button>';
      html += '<div class="sidebar-section-slides">';

      // Walk through lessons and slides for this module
      var modSlideIdx = 0;
      var lessonIdx = 0;
      while (modSlideIdx < mod.slideCount && flatIndex < totalSlides) {
        var slide = COURSE_DATA.slides[flatIndex];
        var isActive = flatIndex === currentSlide;
        var isVisited = visitedSlides.has(flatIndex);

        var icon = isVisited ? '\\u2713' : '\\u25CB';
        var iconClass = isVisited ? ' visited' : '';
        var activeClass = isActive ? ' active' : '';

        html += '<button class="sidebar-slide' + activeClass + iconClass + '" data-slide-idx="' + flatIndex + '">';
        html += '<span class="sidebar-slide-icon">' + icon + '</span>';
        html += '<span class="sidebar-slide-title">' + escapeHtml(slide.title || 'Slide ' + (flatIndex + 1)) + '</span>';
        html += '</button>';

        flatIndex++;
        modSlideIdx++;
      }

      // Progress for this module
      var viewedInModule = 0;
      for (var vi = moduleStartIdx; vi <= moduleEndIdx; vi++) {
        if (visitedSlides.has(vi)) viewedInModule++;
      }
      var allViewed = viewedInModule >= mod.slideCount;
      html += '<div class="sidebar-progress">' + (allViewed ? 'Completed' : viewedInModule + ' / ' + mod.slideCount + ' viewed') + '</div>';

      html += '</div>';
      html += '</div>';
    });

    tree.innerHTML = html;

    // Attach section toggle listeners
    tree.querySelectorAll('.sidebar-section-header').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var section = btn.closest('.sidebar-section');
        if (section) section.classList.toggle('open');
      });
    });

    // Attach slide click listeners
    tree.querySelectorAll('.sidebar-slide').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.getAttribute('data-slide-idx'));
        if (!isNaN(idx)) goToSlide(idx);
      });
    });

    // Scroll active slide into view
    var activeSlide = tree.querySelector('.sidebar-slide.active');
    if (activeSlide) {
      activeSlide.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // Sidebar collapse/expand
  function initSidebar() {
    var collapseBtn = document.getElementById('sidebar-collapse-btn');
    var sidebar = document.getElementById('sidebar');

    if (collapseBtn && sidebar) {
      collapseBtn.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        // Show/create expand button when collapsed
        var expandBtn = document.getElementById('sidebar-expand-btn');
        if (!expandBtn) {
          expandBtn = document.createElement('button');
          expandBtn.id = 'sidebar-expand-btn';
          expandBtn.innerHTML = '\\u203A';
          expandBtn.addEventListener('click', function() {
            sidebar.classList.remove('collapsed');
            expandBtn.style.display = 'none';
          });
          document.body.appendChild(expandBtn);
        }
        expandBtn.style.display = sidebar.classList.contains('collapsed') ? 'flex' : 'none';
      });
    }
  }

  // Initialize
  window.addEventListener('load', function() {
    ScormAPI.init();

    // Restore bookmark
    var bookmark = ScormAPI.getBookmark();
    if (bookmark) {
      currentSlide = parseInt(bookmark) || 0;
    }

    // Restore suspend data
    var suspendData = ScormAPI.getSuspendData();
    if (suspendData) {
      try {
        var data = JSON.parse(suspendData);
        quizAnswers = data.quizAnswers || {};
        var visited = data.visitedSlides || [];
        visited.forEach(function(v) { visitedSlides.add(v); });
      } catch(e) {}
    }

    // Init sidebar collapse/expand
    initSidebar();

    // Show landing page first if enabled
    if (COURSE_DATA.settings.landingPage && COURSE_DATA.settings.landingPage.enabled) {
      renderLandingPage();
    } else {
      renderSlide();
      renderSidebar();
      updateProgress();
      updateNavigation();
    }

    // Keyboard navigation
    if (COURSE_DATA.settings.enableKeyboardNav !== false) {
      document.addEventListener('keydown', function(e) {
        if (showingLanding) return;
        if (e.key === 'ArrowRight') { window.goNext(); }
        else if (e.key === 'ArrowLeft') { window.goPrev(); }
      });
    }
  });

  // Save state and stop narration before unload
  window.addEventListener('beforeunload', function() {
    stopNarration();
    var elapsed = new Date() - startTime;
    ScormAPI.setSessionTime(elapsed);
    saveState();
  });

  function saveState() {
    ScormAPI.setBookmark(String(currentSlide));
    ScormAPI.setSuspendData(JSON.stringify({
      quizAnswers: quizAnswers,
      visitedSlides: Array.from(visitedSlides)
    }));
  }

  function renderSlide() {
    var slide = COURSE_DATA.slides[currentSlide];
    if (!slide) return;
    visitedSlides.add(currentSlide);

    // Track progress measure (SCORM 2004)
    if (typeof ScormAPI.setProgressMeasure === 'function') {
      ScormAPI.setProgressMeasure(visitedSlides.size / totalSlides);
    }

    var container = document.getElementById('slide-content');
    var html = '';

    // Slide transition
    var transition = slide.transition || COURSE_DATA.settings.defaultTransition || 'none';
    container.className = '';
    if (transition !== 'none') {
      container.classList.add('slide-transition-' + transition);
      // Force reflow then add active class
      void container.offsetWidth;
      setTimeout(function() { container.classList.add('slide-transition-active'); }, 20);
    }

    // Background
    container.style.backgroundColor = slide.backgroundColor || '#ffffff';
    if (slide.backgroundImage) {
      container.style.backgroundImage = 'url(' + slide.backgroundImage + ')';
      container.style.backgroundSize = 'cover';
      container.style.backgroundPosition = 'center';
    } else {
      container.style.backgroundImage = '';
    }

    // Full-bleed: drop padding so the inner block can fill the slide edge-to-edge
    if (slide.fullBleed) {
      container.style.padding = '0';
      container.style.overflow = 'hidden';
      container.style.position = 'relative';
    } else {
      container.style.padding = '';
      container.style.overflow = '';
      container.style.position = '';
    }

    var isDark = slide.backgroundColor === '#0f172a' || slide.backgroundColor === '#1e293b';
    var textColor = isDark ? '#f8fafc' : '#1e293b';

    // Cover slide layout
    if (slide.isCoverSlide) {
      html += '<div class="cover-slide">';
      if (slide.backgroundImage) {
        html += '<div class="cover-overlay"></div>';
      }
      html += '<div class="cover-content">';
      if (slide.title) {
        html += '<h1 class="cover-title" style="color:#fff;">' + escapeHtml(slide.title) + '</h1>';
      }
      if (slide.coverSubtitle) {
        html += '<p class="cover-subtitle">' + escapeHtml(slide.coverSubtitle) + '</p>';
      }
      html += '<p class="cover-meta">' + escapeHtml(slide.moduleTitle) + '</p>';
      html += '</div></div>';
      container.innerHTML = html;
      return;
    }

    // Title + breadcrumb (skip on full-bleed slides — the content block fills the slide edge-to-edge)
    if (!slide.fullBleed) {
      if (slide.title) {
        html += '<h1 style="color:' + textColor + ';font-size:2rem;font-weight:700;margin-bottom:1.5rem;">' + slide.title + '</h1>';
      }
      html += '<p style="color:' + (isDark ? '#94a3b8' : '#64748b') + ';font-size:0.75rem;margin-bottom:1rem;">' +
        escapeHtml(slide.moduleTitle) + ' &rsaquo; ' + escapeHtml(slide.lessonTitle) + '</p>';
    }

    // Learning objectives
    if (slide.learningObjectives && slide.learningObjectives.length > 0) {
      html += '<div class="objectives-box">';
      html += '<div class="objectives-header"><span class="objectives-icon">\\u{1F3AF}</span> Learning Objectives</div>';
      html += '<ul class="objectives-list">';
      slide.learningObjectives.forEach(function(obj) {
        html += '<li class="objectives-item"><span class="objectives-check">\\u2713</span> ' + escapeHtml(obj.text) + '</li>';
      });
      html += '</ul></div>';
    }

    // Content blocks
    var isColumn = slide.layout === 'two-column';
    if (isColumn) html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;" class="two-col-grid">';

    var defaultAnim = COURSE_DATA.settings.defaultAnimation || 'none';
    slide.content.forEach(function(block, blockIndex) {
      var anim = block.animation || defaultAnim;
      if (anim && anim !== 'none') {
        var delay = block.animationDelay || (blockIndex * 150);
        html += '<div class="animated" data-animation="' + anim + '" style="animation-delay:' + delay + 'ms;">';
      }

      var d = block.data || {};
      if (block.type === 'text' || block.type === 'heading' || block.type === 'list') {
        html += '<div style="color:' + textColor + ';" class="content-block">' + block.content + '</div>';
      } else if (block.type === 'image' && block.content) {
        html += '<div style="text-align:center;margin:1rem 0;"><img src="' + escapeHtml(block.content) +
          '" alt="' + escapeHtml(block.alt || '') + '" style="max-width:100%;border-radius:0.75rem;box-shadow:0 4px 12px rgba(0,0,0,0.1);"/></div>';
      } else if (block.type === 'video' && block.content) {
        var src = block.content.replace('watch?v=', 'embed/');
        html += '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:0.75rem;margin:1rem 0;">' +
          '<iframe src="' + escapeHtml(src) + '" style="position:absolute;top:0;left:0;width:100%;height:100%;" allowfullscreen></iframe></div>';
      } else if (block.type === 'code') {
        html += '<div style="margin:1rem 0;">' + block.content + '</div>';
      } else if (block.type === 'divider') {
        html += '<hr style="margin:1.5rem 0;border-color:#e2e8f0;"/>';

      } else if (block.type === 'flip-card' && d.flipCards && d.flipCards.length) {
        html += '<div class="flip-card-grid">';
        d.flipCards.forEach(function(card) {
          html += '<div class="flip-card" data-flip-id="' + card.id + '" onclick="this.classList.toggle(\\\'flipped\\\')">';
          html += '<div class="flip-card-inner">';
          html += '<div class="flip-card-front">';
          if (card.frontImage) html += '<img src="' + escapeHtml(card.frontImage) + '" alt="" class="flip-card-img"/>';
          html += '<div class="flip-card-text">' + escapeHtml(card.front) + '</div>';
          html += '</div>';
          html += '<div class="flip-card-back">';
          if (card.backImage) html += '<img src="' + escapeHtml(card.backImage) + '" alt="" class="flip-card-img"/>';
          html += '<div class="flip-card-text">' + escapeHtml(card.back) + '</div>';
          html += '</div>';
          html += '</div></div>';
        });
        html += '</div>';

      } else if (block.type === 'hotspot' && d.hotspotImage) {
        html += '<div class="hotspot-container" id="hotspot_' + block.id + '">';
        html += '<img src="' + escapeHtml(d.hotspotImage) + '" alt="" class="hotspot-img"/>';
        (d.hotspotMarkers || []).forEach(function(m) {
          html += '<button class="hotspot-dot" style="left:' + m.x + '%;top:' + m.y + '%;" data-hotspot-id="' + m.id + '" data-block-id="' + block.id + '">';
          html += '<span class="hotspot-pulse"></span></button>';
          html += '<div class="hotspot-tooltip" id="ht_' + m.id + '">';
          html += '<strong>' + escapeHtml(m.label) + '</strong>';
          if (m.description) html += '<p>' + escapeHtml(m.description) + '</p>';
          html += '</div>';
        });
        html += '</div>';

      } else if (block.type === 'accordion' && d.accordionItems && d.accordionItems.length) {
        html += '<div class="accordion" id="acc_' + block.id + '">';
        d.accordionItems.forEach(function(item) {
          html += '<div class="accordion-item" id="acci_' + item.id + '">';
          html += '<button class="accordion-header" data-acc-id="' + item.id + '">' +
            escapeHtml(item.title) + '<span class="accordion-arrow">\\u25B6</span></button>';
          html += '<div class="accordion-content"><div class="accordion-body">' + escapeHtml(item.content) + '</div></div>';
          html += '</div>';
        });
        html += '</div>';

      } else if (block.type === 'tabs' && d.tabItems && d.tabItems.length) {
        html += '<div class="tabs-container" id="tabs_' + block.id + '">';
        html += '<div class="tabs-nav">';
        d.tabItems.forEach(function(tab, ti) {
          html += '<button class="tab-btn' + (ti === 0 ? ' active' : '') + '" data-tab-id="' + tab.id + '" data-tabs-block="' + block.id + '">' +
            escapeHtml(tab.title) + '</button>';
        });
        html += '</div>';
        d.tabItems.forEach(function(tab, ti) {
          html += '<div class="tab-panel' + (ti === 0 ? ' active' : '') + '" id="tabpanel_' + tab.id + '">' +
            escapeHtml(tab.content) + '</div>';
        });
        html += '</div>';

      } else if (block.type === 'timeline' && d.timelineEvents && d.timelineEvents.length) {
        html += '<div class="timeline">';
        d.timelineEvents.forEach(function(evt, ei) {
          html += '<div class="timeline-item' + (ei % 2 === 1 ? ' timeline-right' : '') + '">';
          html += '<div class="timeline-dot"></div>';
          html += '<div class="timeline-card">';
          if (evt.date) html += '<span class="timeline-date">' + escapeHtml(evt.date) + '</span>';
          html += '<h4 class="timeline-title">' + escapeHtml(evt.title) + '</h4>';
          if (evt.description) html += '<p class="timeline-desc">' + escapeHtml(evt.description) + '</p>';
          html += '</div></div>';
        });
        html += '</div>';

      } else if (block.type === 'callout') {
        var csMap = { info: '#3b82f6', warning: '#f59e0b', tip: '#10b981', success: '#059669' };
        var csBgMap = { info: '#eff6ff', warning: '#fffbeb', tip: '#ecfdf5', success: '#ecfdf5' };
        var csIconMap = { info: '\\u2139\\uFE0F', warning: '\\u26A0\\uFE0F', tip: '\\u2728', success: '\\u2705' };
        var cStyle = d.calloutStyle || 'info';
        var cColor = csMap[cStyle] || csMap.info;
        var cBg = csBgMap[cStyle] || csBgMap.info;
        var cIcon = csIconMap[cStyle] || csIconMap.info;
        html += '<div class="callout" style="border-left:4px solid ' + cColor + ';background:' + cBg + ';">';
        html += '<div class="callout-header"><span class="callout-icon">' + cIcon + '</span>';
        if (d.calloutTitle) html += '<strong>' + escapeHtml(d.calloutTitle) + '</strong>';
        html += '</div>';
        if (block.content) html += '<div class="callout-body">' + block.content + '</div>';
        html += '</div>';

      } else if (block.type === 'table' && d.tableHeaders) {
        html += '<div class="table-wrapper"><table class="scorm-table' + (d.tableStriped ? ' striped' : '') + '">';
        html += '<thead><tr>';
        d.tableHeaders.forEach(function(h) { html += '<th>' + escapeHtml(h) + '</th>'; });
        html += '</tr></thead><tbody>';
        (d.tableRows || []).forEach(function(row) {
          html += '<tr>';
          row.forEach(function(cell) { html += '<td>' + escapeHtml(cell) + '</td>'; });
          html += '</tr>';
        });
        html += '</tbody></table></div>';

      } else if (block.type === 'button') {
        var bStyle = d.buttonStyle || 'primary';
        var bTarget = d.buttonNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
        html += '<div style="margin:1rem 0;">';
        html += '<a href="' + escapeHtml(d.buttonUrl || '#') + '" class="scorm-btn scorm-btn-' + bStyle + '"' + bTarget + '>' +
          escapeHtml(d.buttonText || 'Click here') + '</a>';
        html += '</div>';

      } else if (block.type === 'audio' && d.audioUrl) {
        html += '<div class="audio-block"><audio controls preload="metadata"><source src="' + escapeHtml(d.audioUrl) +
          '"/>Your browser does not support audio.</audio></div>';

      } else if (block.type === 'embed' && d.embedUrl) {
        var eH = d.embedHeight || 400;
        html += '<div class="embed-block"><iframe src="' + escapeHtml(d.embedUrl) +
          '" style="width:100%;height:' + eH + 'px;border:none;border-radius:0.5rem;" sandbox="allow-scripts allow-same-origin allow-popups" allowfullscreen></iframe></div>';

      } else if (block.type === 'gallery' && d.galleryImages && d.galleryImages.length) {
        var gCols = d.galleryColumns || 3;
        html += '<div class="gallery-grid" style="grid-template-columns:repeat(' + gCols + ',1fr);">';
        d.galleryImages.forEach(function(img) {
          html += '<div class="gallery-item">';
          html += '<img src="' + escapeHtml(img.url) + '" alt="' + escapeHtml(img.alt || '') + '" class="gallery-img"/>';
          if (img.caption) html += '<p class="gallery-caption">' + escapeHtml(img.caption) + '</p>';
          html += '</div>';
        });
        html += '</div>';

      } else if (block.type === 'labeled-graphic' && d.labeledImage) {
        html += '<div class="labeled-graphic-container" id="lg_' + block.id + '">';
        html += '<img src="' + escapeHtml(d.labeledImage) + '" alt="" class="labeled-graphic-img"/>';
        (d.labeledMarkers || []).forEach(function(m, mi) {
          html += '<button class="labeled-marker" style="left:' + m.x + '%;top:' + m.y + '%;background:' + (m.color || '#4f46e5') + ';" ' +
            'data-marker-id="' + m.id + '" data-block-id="' + block.id + '">' + (mi + 1) + '</button>';
          html += '<div class="labeled-tooltip" id="lt_' + m.id + '">';
          html += '<strong>' + escapeHtml(m.label) + '</strong>';
          if (m.description) html += '<p>' + escapeHtml(m.description) + '</p>';
          html += '</div>';
        });
        html += '</div>';

      } else if (block.type === 'image-top') {
        var liImgs = d.layoutImages || [];
        var liImg = liImgs[0] || { url: '', caption: '', alt: '' };
        html += '<div class="layout-image-top">';
        if (liImg.url) {
          html += '<img src="' + escapeHtml(liImg.url) + '" alt="' + escapeHtml(liImg.alt || '') + '" class="layout-img"/>';
        } else {
          html += '<div class="layout-img-placeholder"></div>';
        }
        if (liImg.caption) html += '<p class="layout-caption">' + escapeHtml(liImg.caption) + '</p>';
        if (d.layoutText) html += '<div class="layout-text">' + escapeHtml(d.layoutText) + '</div>';
        html += '</div>';

      } else if (block.type === 'image-bottom') {
        var biImgs = d.layoutImages || [];
        var biImg = biImgs[0] || { url: '', caption: '', alt: '' };
        html += '<div class="layout-image-bottom">';
        if (d.layoutText) html += '<div class="layout-text">' + escapeHtml(d.layoutText) + '</div>';
        if (biImg.url) {
          html += '<img src="' + escapeHtml(biImg.url) + '" alt="' + escapeHtml(biImg.alt || '') + '" class="layout-img"/>';
        } else {
          html += '<div class="layout-img-placeholder"></div>';
        }
        if (biImg.caption) html += '<p class="layout-caption">' + escapeHtml(biImg.caption) + '</p>';
        html += '</div>';

      } else if (block.type === 'image-left') {
        var liLImgs = d.layoutImages || [];
        var liLImg = liLImgs[0] || { url: '', caption: '', alt: '' };
        html += '<div class="layout-image-left">';
        html += '<div class="layout-side-img">';
        if (liLImg.url) {
          html += '<img src="' + escapeHtml(liLImg.url) + '" alt="' + escapeHtml(liLImg.alt || '') + '" class="layout-img"/>';
        } else {
          html += '<div class="layout-img-placeholder"></div>';
        }
        if (liLImg.caption) html += '<p class="layout-caption">' + escapeHtml(liLImg.caption) + '</p>';
        html += '</div>';
        html += '<div class="layout-side-text">' + escapeHtml(d.layoutText || '') + '</div>';
        html += '</div>';

      } else if (block.type === 'image-right') {
        var liRImgs = d.layoutImages || [];
        var liRImg = liRImgs[0] || { url: '', caption: '', alt: '' };
        html += '<div class="layout-image-right">';
        html += '<div class="layout-side-text">' + escapeHtml(d.layoutText || '') + '</div>';
        html += '<div class="layout-side-img">';
        if (liRImg.url) {
          html += '<img src="' + escapeHtml(liRImg.url) + '" alt="' + escapeHtml(liRImg.alt || '') + '" class="layout-img"/>';
        } else {
          html += '<div class="layout-img-placeholder"></div>';
        }
        if (liRImg.caption) html += '<p class="layout-caption">' + escapeHtml(liRImg.caption) + '</p>';
        html += '</div>';
        html += '</div>';

      } else if (block.type === 'two-images') {
        var twoImgs = d.layoutImages || [];
        html += '<div class="layout-two-images">';
        for (var ti = 0; ti < 2; ti++) {
          var tImg = twoImgs[ti] || { url: '', caption: '', alt: '' };
          html += '<div class="layout-multi-item">';
          if (tImg.url) {
            html += '<img src="' + escapeHtml(tImg.url) + '" alt="' + escapeHtml(tImg.alt || '') + '" class="layout-img"/>';
          } else {
            html += '<div class="layout-img-placeholder"></div>';
          }
          if (tImg.caption) html += '<p class="layout-caption">' + escapeHtml(tImg.caption) + '</p>';
          html += '</div>';
        }
        html += '</div>';

      } else if (block.type === 'three-images') {
        var threeImgs = d.layoutImages || [];
        html += '<div class="layout-three-images">';
        for (var tri = 0; tri < 3; tri++) {
          var trImg = threeImgs[tri] || { url: '', caption: '', alt: '' };
          html += '<div class="layout-multi-item">';
          if (trImg.url) {
            html += '<img src="' + escapeHtml(trImg.url) + '" alt="' + escapeHtml(trImg.alt || '') + '" class="layout-img"/>';
          } else {
            html += '<div class="layout-img-placeholder"></div>';
          }
          if (trImg.caption) html += '<p class="layout-caption">' + escapeHtml(trImg.caption) + '</p>';
          html += '</div>';
        }
        html += '</div>';

      } else if (block.type === 'scenario' && d.scenarioSteps && d.scenarioSteps.length) {
        html += '<div class="scenario-container" id="scenario_' + block.id + '" data-steps=\\'' + JSON.stringify(d.scenarioSteps).replace(/'/g, '&#39;') + '\\'>';
        if (d.scenarioTitle) html += '<h3 class="scenario-title">' + escapeHtml(d.scenarioTitle) + '</h3>';
        if (d.scenarioDescription) html += '<p class="scenario-desc">' + escapeHtml(d.scenarioDescription) + '</p>';
        if (d.scenarioImage) html += '<img src="' + escapeHtml(d.scenarioImage) + '" alt="" class="scenario-img"/>';
        html += '<div class="scenario-step-indicator"></div>';
        html += '<div class="scenario-step-content"></div>';
        html += '<div class="scenario-feedback"></div>';
        html += '<div class="scenario-choices"></div>';
        html += '<div class="scenario-end" style="display:none;"></div>';
        html += '</div>';

      } else if (block.type === 'checklist' && d.checklistItems && d.checklistItems.length) {
        html += '<div class="checklist-container" id="checklist_' + block.id + '">';
        if (d.checklistTitle) html += '<h3 class="checklist-title">' + escapeHtml(d.checklistTitle) + '</h3>';
        d.checklistItems.forEach(function(item) {
          html += '<div class="checklist-item" data-item-id="' + item.id + '" data-block-id="' + block.id + '">';
          html += '<div class="checklist-checkbox"><svg class="checklist-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></div>';
          html += '<div class="checklist-item-content">';
          html += '<span class="checklist-item-title">' + escapeHtml(item.title) + '</span>';
          if (item.description) html += '<span class="checklist-item-desc">' + escapeHtml(item.description) + '</span>';
          html += '</div></div>';
        });
        html += '<p class="checklist-progress" id="checklist_progress_' + block.id + '">0 of ' + d.checklistItems.length + ' completed</p>';
        html += '</div>';

      } else if (block.type === 'card-sorting' && d.cardSortCategories && d.cardSortCards && d.cardSortCards.length) {
        html += '<div class="card-sort-container" id="cardsort_' + block.id + '">';
        html += '<h3 class="card-sort-title">Sort the Cards</h3>';
        html += '<div class="card-sort-unsorted" id="cardsort_unsorted_' + block.id + '">';
        html += '<p class="card-sort-label">Unsorted</p>';
        html += '<div class="card-sort-pile">';
        d.cardSortCards.forEach(function(card) {
          html += '<div class="card-sort-card" data-card-id="' + card.id + '" data-correct="' + escapeHtml(card.correctCategory) + '" data-block-id="' + block.id + '">';
          html += '<span class="card-sort-card-text">' + escapeHtml(card.text) + '</span>';
          html += '<div class="card-sort-card-buttons">';
          d.cardSortCategories.forEach(function(cat) {
            if (cat.trim()) {
              html += '<button class="card-sort-assign-btn" data-card-id="' + card.id + '" data-category="' + escapeHtml(cat) + '" data-block-id="' + block.id + '">' + escapeHtml(cat) + '</button>';
            }
          });
          html += '</div></div>';
        });
        html += '</div></div>';
        html += '<div class="card-sort-bins">';
        d.cardSortCategories.forEach(function(cat) {
          if (cat.trim()) {
            html += '<div class="card-sort-bin" data-category="' + escapeHtml(cat) + '" data-block-id="' + block.id + '">';
            html += '<p class="card-sort-bin-label">' + escapeHtml(cat) + '</p>';
            html += '<div class="card-sort-bin-cards"></div>';
            html += '</div>';
          }
        });
        html += '</div>';
        html += '<div class="card-sort-result" id="cardsort_result_' + block.id + '"></div>';
        html += '<div class="card-sort-actions">';
        html += '<button class="card-sort-check-btn" data-block-id="' + block.id + '">Check</button>';
        html += '<button class="card-sort-reset-btn" data-block-id="' + block.id + '">Reset</button>';
        html += '</div>';
        html += '</div>';
      } else if (block.type === 'pull-quote') {
        var pq = d || {};
        var pqMode = pq.pqAvatarMode || 'auto';
        var pqName = pq.pqName || '';
        var pqInitials = (function(n) {
          if (!n) return '?';
          var parts = n.trim().split(/\\s+/).filter(Boolean);
          if (parts.length === 0) return '?';
          if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
          return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        })(pqMode === 'initials' && pq.pqInitialsOverride ? pq.pqInitialsOverride : pqName);
        var pqUseImage = pqMode === 'image' && pq.pqPortraitUrl;
        html += '<div style="position:relative;border-radius:8px;padding:2.5rem 3rem;background:#FAF8F4;margin:1.5rem 0;">';
        html += '<div style="position:absolute;left:0;top:2rem;bottom:2rem;width:3px;background:#171D97;"></div>';
        html += '<div style="display:grid;grid-template-columns:auto 1fr;gap:2rem;align-items:start;padding-left:1rem;">';
        if (pqUseImage) {
          html += '<img src="' + escapeHtml(pq.pqPortraitUrl) + '" alt="' + escapeHtml(pqName) + '" style="width:96px;height:96px;border-radius:50%;object-fit:cover;box-shadow:0 6px 18px rgba(10,12,63,0.18);" />';
        } else {
          html += '<div style="width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#171D97 0%,#0A0C3F 100%);color:#D4A574;display:flex;align-items:center;justify-content:center;font-family:Fraunces,Georgia,serif;font-size:34px;font-weight:500;letter-spacing:-0.02em;box-shadow:0 6px 18px rgba(10,12,63,0.18);">' + escapeHtml(pqInitials) + '</div>';
        }
        html += '<div>';
        html += '<div style="font-family:Fraunces,Georgia,serif;font-size:64px;line-height:0.5;color:#D4A574;margin-bottom:6px;">&ldquo;</div>';
        html += '<p style="font-family:Fraunces,Georgia,serif;font-size:22px;line-height:1.4;color:#0A0C3F;font-weight:300;letter-spacing:-0.005em;margin:0 0 22px 0;">' + escapeHtml(pq.pqQuote || '') + '</p>';
        html += '<div style="font-size:14px;font-weight:600;color:#0A0C3F;">' + escapeHtml(pqName || 'Name') + '</div>';
        if (pq.pqRole || pq.pqOrg) {
          html += '<div style="font-size:12px;color:#5C5A57;margin-top:2px;">';
          if (pq.pqRole) html += escapeHtml(pq.pqRole);
          if (pq.pqRole && pq.pqOrg) html += ' &middot; ';
          if (pq.pqOrg) html += '<b style="color:#171D97;font-weight:600;">' + escapeHtml(pq.pqOrg) + '</b>';
          html += '</div>';
        }
        html += '</div></div></div>';
      } else if (block.type === 'comparison' && d.cmpColumns && d.cmpColumns.length > 0) {
        var cols = d.cmpColumns;
        html += '<div style="margin:1.5rem 0;">';
        if (d.cmpEyebrow) {
          html += '<p style="font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#171D97;margin:0 0 0.5rem;">' + escapeHtml(d.cmpEyebrow) + '</p>';
        }
        if (d.cmpTitle) {
          html += '<h3 style="font-family:Fraunces,Georgia,serif;font-size:24px;font-weight:400;color:#0A0C3F;margin:0 0 1.25rem;">' + escapeHtml(d.cmpTitle) + '</h3>';
        }
        html += '<div style="display:grid;gap:1rem;grid-template-columns:repeat(' + Math.min(cols.length, 4) + ',minmax(0,1fr));">';
        cols.forEach(function(c) {
          var border = c.featured ? '2px solid #D4A574' : '1px solid #E8E5DE';
          html += '<div style="position:relative;border-radius:10px;padding:1.25rem;background:#FFFFFF;border:' + border + ';">';
          if (c.featured && c.ribbonLabel) {
            html += '<span style="position:absolute;top:-10px;left:14px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:2px 10px;border-radius:4px;background:#D4A574;color:#FFFFFF;">' + escapeHtml(c.ribbonLabel) + '</span>';
          }
          if (c.eyebrow) {
            html += '<p style="font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#171D97;margin:0 0 4px;">' + escapeHtml(c.eyebrow) + '</p>';
          }
          html += '<p style="font-family:Fraunces,Georgia,serif;font-size:18px;font-weight:500;color:#0A0C3F;line-height:1.15;margin:0;">' + escapeHtml(c.title || '') + '</p>';
          if (c.subtitle) {
            html += '<p style="font-size:12px;font-family:monospace;color:#5C5A57;margin:4px 0 0;">' + escapeHtml(c.subtitle) + '</p>';
          }
          if (c.bullets && c.bullets.length) {
            html += '<ul style="list-style:none;padding:0;margin:0.75rem 0 0;">';
            c.bullets.forEach(function(b) {
              var color = b.included ? '#0A0C3F' : '#9CA3AF';
              var marker = b.included ? '#171D97' : '#D1D5DB';
              var glyph = b.included ? '✓' : '–';
              html += '<li style="font-size:13px;display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;color:' + color + ';">';
              html += '<span style="color:' + marker + ';">' + glyph + '</span><span>' + escapeHtml(b.text) + '</span>';
              html += '</li>';
            });
            html += '</ul>';
          }
          html += '</div>';
        });
        html += '</div></div>';
      }
      // Close animation wrapper if needed
      if (anim && anim !== 'none') {
        html += '</div>';
      }
    });

    if (isColumn) html += '</div>';

    // Questions
    if (slide.questions && slide.questions.length > 0) {
      html += '<div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #e2e8f0;">';
      slide.questions.forEach(function(q, qi) {
        html += renderQuestion(q, qi);
      });
      html += '</div>';
    }

    container.innerHTML = html;

    // Attach event listeners for quiz
    slide.questions && slide.questions.forEach(function(q) {
      attachQuizListeners(q);
    });

    // Accordion listeners
    document.querySelectorAll('.accordion-header').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var item = btn.parentElement;
        item.classList.toggle('open');
      });
    });

    // Tabs listeners
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var blockId = btn.getAttribute('data-tabs-block');
        var tabId = btn.getAttribute('data-tab-id');
        var container = document.getElementById('tabs_' + blockId);
        if (!container) return;
        container.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        container.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var panel = document.getElementById('tabpanel_' + tabId);
        if (panel) panel.classList.add('active');
      });
    });

    // Hotspot listeners
    document.querySelectorAll('.hotspot-dot').forEach(function(dot) {
      dot.addEventListener('click', function(e) {
        e.stopPropagation();
        var mid = dot.getAttribute('data-hotspot-id');
        var tt = document.getElementById('ht_' + mid);
        if (!tt) return;
        var isVisible = tt.classList.contains('visible');
        // Hide all tooltips in this hotspot
        var blockId = dot.getAttribute('data-block-id');
        var parent = document.getElementById('hotspot_' + blockId);
        if (parent) parent.querySelectorAll('.hotspot-tooltip').forEach(function(t) { t.classList.remove('visible'); });
        if (!isVisible) tt.classList.add('visible');
      });
    });

    // Labeled graphic listeners
    document.querySelectorAll('.labeled-marker').forEach(function(marker) {
      marker.addEventListener('click', function(e) {
        e.stopPropagation();
        var mid = marker.getAttribute('data-marker-id');
        var tt = document.getElementById('lt_' + mid);
        if (!tt) return;
        var isVisible = tt.classList.contains('visible');
        var blockId = marker.getAttribute('data-block-id');
        var parent = document.getElementById('lg_' + blockId);
        if (parent) parent.querySelectorAll('.labeled-tooltip').forEach(function(t) { t.classList.remove('visible'); });
        if (!isVisible) tt.classList.add('visible');
      });
    });

    // Close tooltips on outside click
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.hotspot-dot') && !e.target.closest('.hotspot-tooltip')) {
        document.querySelectorAll('.hotspot-tooltip.visible').forEach(function(t) { t.classList.remove('visible'); });
      }
      if (!e.target.closest('.labeled-marker') && !e.target.closest('.labeled-tooltip')) {
        document.querySelectorAll('.labeled-tooltip.visible').forEach(function(t) { t.classList.remove('visible'); });
      }
    });

    // Scenario listeners
    document.querySelectorAll('.scenario-container').forEach(function(el) {
      var stepsData = el.getAttribute('data-steps');
      if (!stepsData) return;
      var steps = JSON.parse(stepsData);
      var currentStep = 0;

      function renderScenarioStep() {
        var step = steps[currentStep];
        if (!step) return;
        var indicator = el.querySelector('.scenario-step-indicator');
        var content = el.querySelector('.scenario-step-content');
        var choicesEl = el.querySelector('.scenario-choices');
        var feedbackEl = el.querySelector('.scenario-feedback');
        var endEl = el.querySelector('.scenario-end');
        indicator.textContent = 'Step ' + (currentStep + 1) + ' of ' + steps.length;
        feedbackEl.style.display = 'none';
        feedbackEl.textContent = '';

        if (step.isEnd) {
          content.style.display = 'none';
          choicesEl.style.display = 'none';
          endEl.style.display = '';
          var endClass = step.endType === 'success' ? 'scenario-end-success' : step.endType === 'failure' ? 'scenario-end-failure' : 'scenario-end-neutral';
          endEl.className = 'scenario-end ' + endClass;
          var endLabel = step.endType === 'success' ? 'Success!' : step.endType === 'failure' ? 'Failed' : 'The End';
          endEl.innerHTML = '<p class="scenario-end-label">' + endLabel + '</p>' +
            '<p class="scenario-end-msg">' + escapeHtml(step.endMessage || step.text) + '</p>' +
            '<button class="scenario-restart-btn">Restart</button>';
          endEl.querySelector('.scenario-restart-btn').addEventListener('click', function() {
            currentStep = 0;
            renderScenarioStep();
          });
        } else {
          content.style.display = '';
          choicesEl.style.display = '';
          endEl.style.display = 'none';
          content.innerHTML = '<p>' + escapeHtml(step.text) + '</p>';
          var choicesHtml = '';
          (step.choices || []).forEach(function(choice) {
            choicesHtml += '<button class="scenario-choice-btn" data-next="' + choice.nextStepId + '" data-feedback="' + escapeHtml(choice.feedback || '') + '">' + escapeHtml(choice.text) + '</button>';
          });
          choicesEl.innerHTML = choicesHtml;
          choicesEl.querySelectorAll('.scenario-choice-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var fb = btn.getAttribute('data-feedback');
              var nextId = btn.getAttribute('data-next');
              var nextIdx = -1;
              for (var si = 0; si < steps.length; si++) { if (steps[si].id === nextId) { nextIdx = si; break; } }
              if (fb) {
                feedbackEl.textContent = fb;
                feedbackEl.style.display = '';
                setTimeout(function() {
                  feedbackEl.style.display = 'none';
                  if (nextIdx >= 0) { currentStep = nextIdx; renderScenarioStep(); }
                }, 2000);
              } else {
                if (nextIdx >= 0) { currentStep = nextIdx; renderScenarioStep(); }
              }
            });
          });
        }
      }
      renderScenarioStep();
    });

    // Checklist listeners
    document.querySelectorAll('.checklist-item').forEach(function(item) {
      item.addEventListener('click', function() {
        item.classList.toggle('checked');
        var blockId = item.getAttribute('data-block-id');
        var container = document.getElementById('checklist_' + blockId);
        if (!container) return;
        var total = container.querySelectorAll('.checklist-item').length;
        var checked = container.querySelectorAll('.checklist-item.checked').length;
        var prog = document.getElementById('checklist_progress_' + blockId);
        if (prog) prog.textContent = checked + ' of ' + total + ' completed';
      });
    });

    // Card sorting listeners
    document.querySelectorAll('.card-sort-assign-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var cardId = btn.getAttribute('data-card-id');
        var category = btn.getAttribute('data-category');
        var blockId = btn.getAttribute('data-block-id');
        var card = document.querySelector('.card-sort-card[data-card-id="' + cardId + '"][data-block-id="' + blockId + '"]');
        if (!card) return;
        // Move card to the bin
        var bin = document.querySelector('.card-sort-bin[data-category="' + category + '"][data-block-id="' + blockId + '"] .card-sort-bin-cards');
        if (!bin) return;
        // Create a bin card element
        var binCard = document.createElement('div');
        binCard.className = 'card-sort-bin-card';
        binCard.setAttribute('data-card-id', cardId);
        binCard.setAttribute('data-correct', card.getAttribute('data-correct'));
        binCard.setAttribute('data-assigned', category);
        binCard.innerHTML = '<span>' + card.querySelector('.card-sort-card-text').textContent + '</span>' +
          '<button class="card-sort-remove-btn" data-card-id="' + cardId + '" data-block-id="' + blockId + '">&times;</button>';
        bin.appendChild(binCard);
        // Hide original card
        card.style.display = 'none';
        // Clear result
        var result = document.getElementById('cardsort_result_' + blockId);
        if (result) { result.textContent = ''; result.className = 'card-sort-result'; }
        // Attach remove listener
        binCard.querySelector('.card-sort-remove-btn').addEventListener('click', function(ev) {
          ev.stopPropagation();
          binCard.remove();
          card.style.display = '';
          if (result) { result.textContent = ''; result.className = 'card-sort-result'; }
        });
      });
    });

    document.querySelectorAll('.card-sort-check-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var blockId = btn.getAttribute('data-block-id');
        var container = document.getElementById('cardsort_' + blockId);
        if (!container) return;
        var binCards = container.querySelectorAll('.card-sort-bin-card');
        var allCards = container.querySelectorAll('.card-sort-card');
        var unsortedVisible = 0;
        allCards.forEach(function(c) { if (c.style.display !== 'none') unsortedVisible++; });
        if (unsortedVisible > 0) return; // not all sorted
        var allCorrect = true;
        binCards.forEach(function(bc) {
          var correct = bc.getAttribute('data-correct');
          var assigned = bc.getAttribute('data-assigned');
          if (correct === assigned) {
            bc.classList.add('correct');
            bc.classList.remove('incorrect');
          } else {
            bc.classList.add('incorrect');
            bc.classList.remove('correct');
            allCorrect = false;
          }
        });
        var result = document.getElementById('cardsort_result_' + blockId);
        if (result) {
          result.textContent = allCorrect ? 'All cards are in the correct categories!' : 'Some cards are in the wrong category. Try again!';
          result.className = 'card-sort-result ' + (allCorrect ? 'card-sort-correct' : 'card-sort-incorrect');
        }
      });
    });

    document.querySelectorAll('.card-sort-reset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var blockId = btn.getAttribute('data-block-id');
        var container = document.getElementById('cardsort_' + blockId);
        if (!container) return;
        container.querySelectorAll('.card-sort-bin-card').forEach(function(bc) { bc.remove(); });
        container.querySelectorAll('.card-sort-card').forEach(function(c) { c.style.display = ''; });
        var result = document.getElementById('cardsort_result_' + blockId);
        if (result) { result.textContent = ''; result.className = 'card-sort-result'; }
      });
    });

    // Drag-sort listeners
    attachDragSort();

    // Scroll-reveal: Intersection Observer for animated blocks
    if (COURSE_DATA.settings.enableScrollReveal) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      document.querySelectorAll('.animated').forEach(function(el) {
        observer.observe(el);
      });
    } else {
      // No scroll reveal: trigger all animations immediately
      document.querySelectorAll('.animated').forEach(function(el) {
        el.classList.add('in-view');
      });
    }
  }

  function attachDragSort() {
    var dragItem = null;
    document.querySelectorAll('.drag-sort-item[draggable="true"]').forEach(function(item) {
      item.addEventListener('dragstart', function(e) {
        dragItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', function() {
        item.classList.remove('dragging');
        dragItem = null;
        // Update order in quizAnswers
        var qid = item.getAttribute('data-qid');
        var list = item.parentElement;
        var newOrder = [];
        list.querySelectorAll('.drag-sort-item').forEach(function(el) {
          newOrder.push(el.getAttribute('data-opt-id'));
        });
        quizAnswers[qid] = newOrder;
        // Show submit button
        var submitBtn = document.getElementById('submit_' + qid);
        if (submitBtn) submitBtn.style.display = 'inline-block';
      });
      item.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dragItem || dragItem === item) return;
        var list = item.parentElement;
        var items = Array.from(list.querySelectorAll('.drag-sort-item'));
        var dragIdx = items.indexOf(dragItem);
        var hoverIdx = items.indexOf(item);
        if (dragIdx < hoverIdx) {
          list.insertBefore(dragItem, item.nextSibling);
        } else {
          list.insertBefore(dragItem, item);
        }
      });
    });
  }

  function renderQuestion(q, idx) {
    var isSubmitted = submittedQuizzes[q.id];
    var answer = quizAnswers[q.id];
    var html = '<div id="q_' + q.id + '" style="background:#fff;border-radius:0.75rem;padding:1.5rem;margin-bottom:1rem;border:1px solid #e2e8f0;">';
    html += '<div style="display:flex;align-items:flex-start;gap:0.75rem;margin-bottom:1rem;">';
    html += '<span style="background:' + (COURSE_DATA.settings.primaryColor || '#4f46e5') + ';color:#fff;width:1.75rem;height:1.75rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.875rem;font-weight:700;flex-shrink:0;">' + (idx + 1) + '</span>';
    html += '<div><p style="font-weight:500;color:#1e293b;">' + escapeHtml(q.text) + '</p>';
    html += '<p style="font-size:0.75rem;color:#94a3b8;margin-top:0.25rem;">' + q.points + ' points</p></div></div>';

    if (q.type === 'multiple-choice' || q.type === 'true-false') {
      html += '<div style="margin-left:2.5rem;">';
      q.options.forEach(function(opt) {
        var isSelected = answer === opt.id;
        var borderColor = '#e2e8f0';
        var bgColor = '#fff';
        if (isSubmitted) {
          if (opt.isCorrect) { borderColor = '#10b981'; bgColor = '#ecfdf5'; }
          else if (isSelected) { borderColor = '#ef4444'; bgColor = '#fef2f2'; }
        } else if (isSelected) {
          borderColor = COURSE_DATA.settings.primaryColor || '#4f46e5';
          bgColor = '#eef2ff';
        }
        html += '<button data-qid="' + q.id + '" data-oid="' + opt.id + '" class="quiz-option" ' +
          (isSubmitted ? 'disabled' : '') +
          ' style="display:block;width:100%;text-align:left;padding:0.75rem 1rem;border:2px solid ' + borderColor +
          ';border-radius:0.5rem;margin-bottom:0.5rem;background:' + bgColor + ';cursor:pointer;font-size:0.875rem;transition:all 0.15s;">' +
          escapeHtml(opt.text) + '</button>';
      });
      html += '</div>';
    } else if (q.type === 'fill-in-blank') {
      var inputBorder = '#e2e8f0';
      var inputBg = '#fff';
      if (isSubmitted) {
        var correct = answer && answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
        inputBorder = correct ? '#10b981' : '#ef4444';
        inputBg = correct ? '#ecfdf5' : '#fef2f2';
      }
      html += '<div style="margin-left:2.5rem;">';
      html += '<input type="text" id="fib_' + q.id + '" data-qid="' + q.id + '" class="quiz-fib" value="' + escapeHtml(answer || '') + '"' +
        (isSubmitted ? ' disabled' : '') +
        ' placeholder="Type your answer..." style="width:100%;padding:0.5rem 0.75rem;border:2px solid ' + inputBorder +
        ';border-radius:0.5rem;font-size:0.875rem;background:' + inputBg + ';outline:none;"/>';
      if (isSubmitted && !( answer && answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim())) {
        html += '<p style="font-size:0.875rem;color:#059669;margin-top:0.25rem;">Correct: ' + escapeHtml(q.correctAnswer) + '</p>';
      }
      html += '</div>';
    } else if (q.type === 'matching') {
      html += '<div style="margin-left:2.5rem;">';
      q.matchingPairs.forEach(function(pair) {
        html += '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">';
        html += '<span style="padding:0.5rem 0.75rem;background:#f1f5f9;border-radius:0.5rem;font-size:0.875rem;font-weight:500;min-width:8rem;">' + escapeHtml(pair.left) + '</span>';
        html += '<span style="color:#94a3b8;">&rarr;</span>';
        html += '<span style="padding:0.5rem 0.75rem;background:#eef2ff;border-radius:0.5rem;font-size:0.875rem;min-width:8rem;">' + escapeHtml(pair.right) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    } else if (q.type === 'drag-sort') {
      var sortOrder = quizAnswers[q.id] || q.options.map(function(o) { return o.id; });
      html += '<div style="margin-left:2.5rem;" class="drag-sort-list" data-qid="' + q.id + '">';
      sortOrder.forEach(function(optId, si) {
        var opt = q.options.find(function(o) { return o.id === optId; });
        if (!opt) return;
        var itemBorder = '#e2e8f0';
        var itemBg = '#fff';
        if (isSubmitted) {
          var correctIdx = q.correctOrder.indexOf(optId);
          if (correctIdx === si) { itemBorder = '#10b981'; itemBg = '#ecfdf5'; }
          else { itemBorder = '#ef4444'; itemBg = '#fef2f2'; }
        }
        html += '<div class="drag-sort-item" draggable="' + (!isSubmitted) + '" data-opt-id="' + optId + '" data-qid="' + q.id + '" ' +
          'style="border:2px solid ' + itemBorder + ';background:' + itemBg + ';">';
        html += '<span class="drag-sort-handle">' + (isSubmitted ? '' : '\\u2261') + '</span>';
        html += '<span class="drag-sort-num">' + (si + 1) + '</span>';
        html += '<span>' + escapeHtml(opt.text) + '</span>';
        html += '</div>';
      });
      html += '</div>';
      if (isSubmitted) {
        html += '<div style="margin-left:2.5rem;margin-top:0.5rem;font-size:0.75rem;color:#64748b;">Correct order: ';
        q.correctOrder.forEach(function(cid, ci) {
          var copt = q.options.find(function(o) { return o.id === cid; });
          if (copt) html += (ci > 0 ? ', ' : '') + escapeHtml(copt.text);
        });
        html += '</div>';
      }
    } else if (q.type === 'likert') {
      var labels = q.likertLabels || ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
      html += '<div style="margin-left:2.5rem;" class="likert-row" data-qid="' + q.id + '">';
      labels.forEach(function(label, li) {
        var isSelected = answer === li;
        var btnBorder = '#e2e8f0';
        var btnBg = '#fff';
        var btnColor = '#475569';
        if (isSubmitted) {
          if (q.likertCorrectIndex !== undefined && li === q.likertCorrectIndex) { btnBorder = '#10b981'; btnBg = '#ecfdf5'; }
          else if (isSelected) { btnBorder = '#ef4444'; btnBg = '#fef2f2'; }
        } else if (isSelected) {
          btnBorder = COURSE_DATA.settings.primaryColor || '#4f46e5';
          btnBg = '#eef2ff';
          btnColor = COURSE_DATA.settings.primaryColor || '#4f46e5';
        }
        html += '<button class="likert-btn" data-qid="' + q.id + '" data-index="' + li + '" ' +
          (isSubmitted ? 'disabled' : '') +
          ' style="border:2px solid ' + btnBorder + ';background:' + btnBg + ';color:' + btnColor + ';">' +
          escapeHtml(label) + '</button>';
      });
      html += '</div>';
    } else if (q.type === 'rating') {
      var rMax = q.ratingMax || 5;
      var style = q.ratingStyle || 'stars';
      var selectedVal = answer !== undefined ? answer : -1;
      html += '<div style="margin-left:2.5rem;" class="rating-row" data-qid="' + q.id + '" data-style="' + style + '">';
      for (var ri = 1; ri <= rMax; ri++) {
        var isActive = ri <= selectedVal;
        var rBorder = '#e2e8f0';
        var rBg = '#fff';
        if (isSubmitted) {
          if (q.ratingCorrect !== undefined && ri <= q.ratingCorrect) { rBorder = '#10b981'; rBg = '#ecfdf5'; }
          else if (isActive && ri > (q.ratingCorrect || 0)) { rBorder = '#ef4444'; rBg = '#fef2f2'; }
        } else if (isActive) {
          rBorder = COURSE_DATA.settings.primaryColor || '#4f46e5';
          rBg = '#eef2ff';
        }
        var rLabel = '';
        if (style === 'stars') {
          rLabel = isActive ? '\\u2605' : '\\u2606';
        } else if (style === 'emoji') {
          var emojis = ['\\uD83D\\uDE22', '\\uD83D\\uDE15', '\\uD83D\\uDE10', '\\uD83D\\uDE42', '\\uD83D\\uDE0A'];
          rLabel = emojis[Math.min(ri - 1, emojis.length - 1)] || String(ri);
        } else {
          rLabel = String(ri);
        }
        html += '<button class="rating-star" data-qid="' + q.id + '" data-value="' + ri + '" ' +
          (isSubmitted ? 'disabled' : '') +
          ' style="border:2px solid ' + rBorder + ';background:' + rBg + ';">' +
          rLabel + '</button>';
      }
      html += '</div>';
    } else if (q.type === 'slider') {
      var sMin = q.sliderMin !== undefined ? q.sliderMin : 0;
      var sMax = q.sliderMax !== undefined ? q.sliderMax : 100;
      var sStep = q.sliderStep || 1;
      var sVal = answer !== undefined ? answer : Math.round((sMin + sMax) / 2);
      var sUnit = q.sliderUnit || '';
      html += '<div style="margin-left:2.5rem;" class="slider-container" data-qid="' + q.id + '">';
      html += '<div class="slider-labels"><span>' + sMin + sUnit + '</span><span class="slider-value" id="sliderval_' + q.id + '">' + sVal + sUnit + '</span><span>' + sMax + sUnit + '</span></div>';
      html += '<input type="range" class="slider-input" id="slider_' + q.id + '" data-qid="' + q.id + '" ' +
        'min="' + sMin + '" max="' + sMax + '" step="' + sStep + '" value="' + sVal + '" ' +
        (isSubmitted ? 'disabled' : '') + ' style="width:100%;accent-color:' + (COURSE_DATA.settings.primaryColor || '#4f46e5') + ';"/>';
      html += '</div>';
      if (isSubmitted && q.sliderCorrect !== undefined) {
        html += '<p style="margin-left:2.5rem;font-size:0.75rem;color:#64748b;margin-top:0.25rem;">Target: ' + q.sliderCorrect + sUnit + '</p>';
      }
    } else if (q.type === 'image-choice') {
      var icCols = q.imageChoiceColumns || 3;
      html += '<div class="image-choice-grid" data-qid="' + q.id + '" style="margin-left:2.5rem;grid-template-columns:repeat(' + icCols + ',1fr);">';
      q.options.forEach(function(opt) {
        var isSelected = answer === opt.id;
        var icBorder = '#e2e8f0';
        var icBg = '#fff';
        if (isSubmitted) {
          if (opt.isCorrect) { icBorder = '#10b981'; icBg = '#ecfdf5'; }
          else if (isSelected) { icBorder = '#ef4444'; icBg = '#fef2f2'; }
        } else if (isSelected) {
          icBorder = COURSE_DATA.settings.primaryColor || '#4f46e5';
          icBg = '#eef2ff';
        }
        html += '<button class="image-choice-card" data-qid="' + q.id + '" data-oid="' + opt.id + '" ' +
          (isSubmitted ? 'disabled' : '') +
          ' style="border:2px solid ' + icBorder + ';background:' + icBg + ';">';
        if (opt.imageUrl) {
          html += '<img src="' + escapeHtml(opt.imageUrl) + '" alt="' + escapeHtml(opt.text) + '" class="image-choice-img"/>';
        }
        html += '<span class="image-choice-label">' + escapeHtml(opt.text) + '</span>';
        if (isSelected) html += '<span class="image-choice-check">\\u2713</span>';
        html += '</button>';
      });
      html += '</div>';
    } else if (q.type === 'matrix') {
      var mRows = q.matrixRows || [];
      var mCols = q.matrixColumns || [];
      var mAnswers = answer || {};
      html += '<div style="margin-left:2.5rem;" class="matrix-table-wrap">';
      html += '<table class="matrix-table" data-qid="' + q.id + '">';
      html += '<thead><tr><th></th>';
      mCols.forEach(function(col) {
        html += '<th>' + escapeHtml(col) + '</th>';
      });
      html += '</tr></thead><tbody>';
      mRows.forEach(function(row) {
        html += '<tr data-row-id="' + row.id + '">';
        html += '<td class="matrix-row-label">' + escapeHtml(row.label) + '</td>';
        mCols.forEach(function(col, ci) {
          var isChecked = mAnswers[row.id] === ci;
          var cellClass = '';
          if (isSubmitted && q.matrixGraded) {
            if (row.correctColumn !== undefined) {
              if (ci === row.correctColumn && isChecked) cellClass = ' matrix-correct';
              else if (isChecked && ci !== row.correctColumn) cellClass = ' matrix-incorrect';
              else if (ci === row.correctColumn) cellClass = ' matrix-expected';
            }
          }
          html += '<td class="matrix-cell' + cellClass + '">';
          html += '<input type="radio" name="matrix_' + q.id + '_' + row.id + '" class="matrix-radio" ' +
            'data-qid="' + q.id + '" data-row="' + row.id + '" data-col="' + ci + '" ' +
            (isChecked ? 'checked' : '') + ' ' + (isSubmitted ? 'disabled' : '') + '/>';
          html += '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    } else if (q.type === 'dropdown') {
      var ddPlaceholder = q.dropdownPlaceholder || 'Select an answer...';
      var selBorder = '#e2e8f0';
      if (isSubmitted) {
        var ddCorrect = q.options.find(function(o) { return o.isCorrect; });
        selBorder = (ddCorrect && ddCorrect.id === answer) ? '#10b981' : '#ef4444';
      }
      html += '<div style="margin-left:2.5rem;">';
      html += '<select class="dropdown-select" id="dd_' + q.id + '" data-qid="' + q.id + '" ' +
        (isSubmitted ? 'disabled' : '') +
        ' style="border:2px solid ' + selBorder + ';">';
      html += '<option value="">' + escapeHtml(ddPlaceholder) + '</option>';
      q.options.forEach(function(opt) {
        html += '<option value="' + opt.id + '"' + (answer === opt.id ? ' selected' : '') + '>' + escapeHtml(opt.text) + '</option>';
      });
      html += '</select>';
      if (isSubmitted) {
        var ddC = q.options.find(function(o) { return o.isCorrect; });
        if (ddC && ddC.id !== answer) {
          html += '<p style="font-size:0.875rem;color:#059669;margin-top:0.25rem;">Correct: ' + escapeHtml(ddC.text) + '</p>';
        }
      }
      html += '</div>';
    } else if (q.type === 'open-ended') {
      var oeMax = q.openEndedMaxLength || 1000;
      var oePlaceholder = q.openEndedPlaceholder || 'Type your response...';
      var oeVal = answer || '';
      var oeBorder = '#e2e8f0';
      if (isSubmitted) {
        oeBorder = '#10b981'; // open-ended is generally "complete"
        if (q.openEndedKeywords && q.openEndedKeywords.length > 0) {
          var kwCount = 0;
          q.openEndedKeywords.forEach(function(kw) {
            if (oeVal.toLowerCase().indexOf(kw.toLowerCase()) !== -1) kwCount++;
          });
          oeBorder = kwCount > 0 ? '#10b981' : '#ef4444';
        }
      }
      html += '<div style="margin-left:2.5rem;">';
      html += '<textarea class="open-ended-textarea" id="oe_' + q.id + '" data-qid="' + q.id + '" ' +
        'maxlength="' + oeMax + '" placeholder="' + escapeHtml(oePlaceholder) + '" ' +
        (isSubmitted ? 'disabled' : '') +
        ' style="border:2px solid ' + oeBorder + ';">' + escapeHtml(oeVal) + '</textarea>';
      html += '<div class="open-ended-counter"><span id="oe_count_' + q.id + '">' + oeVal.length + '</span> / ' + oeMax + '</div>';
      html += '</div>';
    } else if (q.type === 'ranking') {
      var rankOrder = quizAnswers[q.id] || q.options.map(function(o) { return o.id; });
      html += '<div style="margin-left:2.5rem;" class="ranking-list" data-qid="' + q.id + '">';
      rankOrder.forEach(function(optId, ri) {
        var opt = q.options.find(function(o) { return o.id === optId; });
        if (!opt) return;
        var riBorder = '#e2e8f0';
        var riBg = '#fff';
        if (isSubmitted && q.correctOrder) {
          var correctAtIdx = q.correctOrder.indexOf(optId);
          if (correctAtIdx === ri) { riBorder = '#10b981'; riBg = '#ecfdf5'; }
          else { riBorder = '#ef4444'; riBg = '#fef2f2'; }
        }
        html += '<div class="ranking-item" data-opt-id="' + optId + '" data-qid="' + q.id + '" ' +
          'style="border:2px solid ' + riBorder + ';background:' + riBg + ';">';
        html += '<span class="ranking-num">' + (ri + 1) + '</span>';
        html += '<span class="ranking-text">' + escapeHtml(opt.text) + '</span>';
        if (!isSubmitted) {
          html += '<span class="ranking-buttons">';
          html += '<button class="ranking-up" data-qid="' + q.id + '" data-opt-id="' + optId + '" ' + (ri === 0 ? 'disabled' : '') + '>\\u25B2</button>';
          html += '<button class="ranking-down" data-qid="' + q.id + '" data-opt-id="' + optId + '" ' + (ri === rankOrder.length - 1 ? 'disabled' : '') + '>\\u25BC</button>';
          html += '</span>';
        }
        html += '</div>';
      });
      html += '</div>';
      if (isSubmitted && q.correctOrder) {
        html += '<div style="margin-left:2.5rem;margin-top:0.5rem;font-size:0.75rem;color:#64748b;">Correct order: ';
        q.correctOrder.forEach(function(cid, ci) {
          var copt = q.options.find(function(o) { return o.id === cid; });
          if (copt) html += (ci > 0 ? ', ' : '') + escapeHtml(copt.text);
        });
        html += '</div>';
      }
    } else if (q.type === 'hotspot-question') {
      html += '<div style="margin-left:2.5rem;" class="hotspot-click-area" id="hsq_' + q.id + '" data-qid="' + q.id + '">';
      if (q.hotspotImage) {
        html += '<img src="' + escapeHtml(q.hotspotImage) + '" alt="Click on the correct area" class="hotspot-click-img"/>';
      }
      if (answer) {
        var marker = answer;
        var markerColor = '#4f46e5';
        if (isSubmitted) {
          var inZone = false;
          (q.hotspotZones || []).forEach(function(zone) {
            if (!zone.isCorrect) return;
            var dx = marker.x - zone.x;
            var dy = marker.y - zone.y;
            if (Math.sqrt(dx * dx + dy * dy) <= zone.radius) inZone = true;
          });
          markerColor = inZone ? '#10b981' : '#ef4444';
        }
        html += '<div class="hotspot-click-marker" style="left:' + marker.x + '%;top:' + marker.y + '%;background:' + markerColor + ';"></div>';
      }
      if (isSubmitted) {
        (q.hotspotZones || []).forEach(function(zone) {
          if (zone.isCorrect) {
            html += '<div class="hotspot-zone-hint" style="left:' + zone.x + '%;top:' + zone.y + '%;width:' + (zone.radius * 2) + '%;height:' + (zone.radius * 2) + '%;"></div>';
          }
        });
      }
      html += '</div>';
    }

    // Submit button
    if (!isSubmitted && q.type !== 'matching') {
      html += '<div style="margin-left:2.5rem;margin-top:0.75rem;">';
      html += '<button id="submit_' + q.id + '" data-qid="' + q.id + '" class="quiz-submit" ' +
        'style="padding:0.5rem 1rem;background:' + (COURSE_DATA.settings.primaryColor || '#4f46e5') +
        ';color:#fff;border:none;border-radius:0.5rem;font-size:0.875rem;cursor:pointer;display:' + (answer !== undefined && answer !== null && answer !== '' ? 'inline-block' : 'none') + ';">Check Answer</button>';
      html += '</div>';
    }

    // Feedback
    if (isSubmitted && COURSE_DATA.settings.showFeedback && q.explanation) {
      var qCorrect = isQuestionCorrect(q);
      html += '<div style="margin:0.75rem 0 0 2.5rem;padding:0.75rem;border-radius:0.5rem;font-size:0.875rem;background:' +
        (qCorrect ? '#ecfdf5;color:#065f46' : '#fffbeb;color:#92400e') + ';">';
      html += '<p style="font-weight:600;margin-bottom:0.25rem;">' + (qCorrect ? 'Correct!' : 'Incorrect') + '</p>';
      html += '<p>' + escapeHtml(q.explanation) + '</p></div>';
    }

    html += '</div>';
    return html;
  }

  function isQuestionCorrect(q) {
    var answer = quizAnswers[q.id];
    if (answer === undefined || answer === null) return false;
    if (q.type === 'multiple-choice' || q.type === 'true-false') {
      var correct = q.options.find(function(o) { return o.isCorrect; });
      return correct && correct.id === answer;
    }
    if (q.type === 'fill-in-blank') {
      return answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
    }
    if (q.type === 'drag-sort') {
      if (!Array.isArray(answer) || !q.correctOrder) return false;
      return answer.length === q.correctOrder.length && answer.every(function(id, i) { return id === q.correctOrder[i]; });
    }
    if (q.type === 'likert') {
      if (q.likertCorrectIndex === undefined) return true;
      return answer === q.likertCorrectIndex;
    }
    if (q.type === 'rating') {
      if (q.ratingCorrect === undefined) return true;
      return answer >= q.ratingCorrect;
    }
    if (q.type === 'slider') {
      if (q.sliderCorrect === undefined) return true;
      var tolerance = Math.abs((q.sliderMax || 100) - (q.sliderMin || 0)) * 0.1;
      return Math.abs(answer - q.sliderCorrect) <= tolerance;
    }
    if (q.type === 'image-choice') {
      var icCorrect = q.options.find(function(o) { return o.isCorrect; });
      return icCorrect && icCorrect.id === answer;
    }
    if (q.type === 'matrix') {
      if (!q.matrixGraded) return true;
      var mRows = q.matrixRows || [];
      return mRows.every(function(row) {
        if (row.correctColumn === undefined) return true;
        return answer[row.id] === row.correctColumn;
      });
    }
    if (q.type === 'dropdown') {
      var ddCorrect = q.options.find(function(o) { return o.isCorrect; });
      return ddCorrect && ddCorrect.id === answer;
    }
    if (q.type === 'open-ended') {
      if (!q.openEndedKeywords || q.openEndedKeywords.length === 0) return true;
      var kwMatches = 0;
      q.openEndedKeywords.forEach(function(kw) {
        if (String(answer).toLowerCase().indexOf(kw.toLowerCase()) !== -1) kwMatches++;
      });
      return kwMatches > 0;
    }
    if (q.type === 'ranking') {
      if (!Array.isArray(answer) || !q.correctOrder) return false;
      return answer.length === q.correctOrder.length && answer.every(function(id, i) { return id === q.correctOrder[i]; });
    }
    if (q.type === 'hotspot-question') {
      if (!answer || !q.hotspotZones) return false;
      return q.hotspotZones.some(function(zone) {
        if (!zone.isCorrect) return false;
        var dx = answer.x - zone.x;
        var dy = answer.y - zone.y;
        return Math.sqrt(dx * dx + dy * dy) <= zone.radius;
      });
    }
    return false;
  }

  function attachQuizListeners(q) {
    // Option click (multiple-choice, true-false)
    document.querySelectorAll('[data-qid="' + q.id + '"].quiz-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (submittedQuizzes[q.id]) return;
        quizAnswers[q.id] = btn.getAttribute('data-oid');
        renderSlide();
      });
    });

    // Fill-in-blank input
    var fib = document.getElementById('fib_' + q.id);
    if (fib) {
      fib.addEventListener('input', function() {
        quizAnswers[q.id] = fib.value;
        var submitBtn = document.getElementById('submit_' + q.id);
        if (submitBtn) submitBtn.style.display = fib.value ? 'inline-block' : 'none';
      });
    }

    // Likert buttons
    document.querySelectorAll('.likert-btn[data-qid="' + q.id + '"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (submittedQuizzes[q.id]) return;
        quizAnswers[q.id] = parseInt(btn.getAttribute('data-index'));
        var submitBtn = document.getElementById('submit_' + q.id);
        if (submitBtn) submitBtn.style.display = 'inline-block';
        renderSlide();
      });
    });

    // Rating buttons
    document.querySelectorAll('.rating-star[data-qid="' + q.id + '"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (submittedQuizzes[q.id]) return;
        quizAnswers[q.id] = parseInt(btn.getAttribute('data-value'));
        var submitBtn = document.getElementById('submit_' + q.id);
        if (submitBtn) submitBtn.style.display = 'inline-block';
        renderSlide();
      });
    });

    // Slider input
    var slider = document.getElementById('slider_' + q.id);
    if (slider) {
      slider.addEventListener('input', function() {
        var val = parseFloat(slider.value);
        quizAnswers[q.id] = val;
        var valDisplay = document.getElementById('sliderval_' + q.id);
        if (valDisplay) valDisplay.textContent = val + (q.sliderUnit || '');
        var submitBtn = document.getElementById('submit_' + q.id);
        if (submitBtn) submitBtn.style.display = 'inline-block';
      });
    }

    // Image-choice cards
    document.querySelectorAll('.image-choice-card[data-qid="' + q.id + '"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (submittedQuizzes[q.id]) return;
        quizAnswers[q.id] = btn.getAttribute('data-oid');
        var submitBtn = document.getElementById('submit_' + q.id);
        if (submitBtn) submitBtn.style.display = 'inline-block';
        renderSlide();
      });
    });

    // Matrix radio buttons
    document.querySelectorAll('.matrix-radio[data-qid="' + q.id + '"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        if (submittedQuizzes[q.id]) return;
        var rowId = radio.getAttribute('data-row');
        var colIdx = parseInt(radio.getAttribute('data-col'));
        if (!quizAnswers[q.id]) quizAnswers[q.id] = {};
        quizAnswers[q.id][rowId] = colIdx;
        var submitBtn = document.getElementById('submit_' + q.id);
        if (submitBtn) submitBtn.style.display = 'inline-block';
      });
    });

    // Dropdown select
    var dd = document.getElementById('dd_' + q.id);
    if (dd) {
      dd.addEventListener('change', function() {
        quizAnswers[q.id] = dd.value || undefined;
        var submitBtn = document.getElementById('submit_' + q.id);
        if (submitBtn) submitBtn.style.display = dd.value ? 'inline-block' : 'none';
      });
    }

    // Open-ended textarea
    var oe = document.getElementById('oe_' + q.id);
    if (oe) {
      oe.addEventListener('input', function() {
        quizAnswers[q.id] = oe.value;
        var counter = document.getElementById('oe_count_' + q.id);
        if (counter) counter.textContent = oe.value.length;
        var submitBtn = document.getElementById('submit_' + q.id);
        if (submitBtn) submitBtn.style.display = oe.value.trim() ? 'inline-block' : 'none';
      });
    }

    // Ranking up/down buttons
    document.querySelectorAll('.ranking-up[data-qid="' + q.id + '"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (submittedQuizzes[q.id]) return;
        var optId = btn.getAttribute('data-opt-id');
        var order = quizAnswers[q.id] || q.options.map(function(o) { return o.id; });
        var idx = order.indexOf(optId);
        if (idx > 0) {
          var temp = order[idx - 1];
          order[idx - 1] = order[idx];
          order[idx] = temp;
          quizAnswers[q.id] = order;
          var submitBtn = document.getElementById('submit_' + q.id);
          if (submitBtn) submitBtn.style.display = 'inline-block';
          renderSlide();
        }
      });
    });
    document.querySelectorAll('.ranking-down[data-qid="' + q.id + '"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (submittedQuizzes[q.id]) return;
        var optId = btn.getAttribute('data-opt-id');
        var order = quizAnswers[q.id] || q.options.map(function(o) { return o.id; });
        var idx = order.indexOf(optId);
        if (idx < order.length - 1) {
          var temp = order[idx + 1];
          order[idx + 1] = order[idx];
          order[idx] = temp;
          quizAnswers[q.id] = order;
          var submitBtn = document.getElementById('submit_' + q.id);
          if (submitBtn) submitBtn.style.display = 'inline-block';
          renderSlide();
        }
      });
    });

    // Hotspot-question click
    var hsArea = document.getElementById('hsq_' + q.id);
    if (hsArea && !submittedQuizzes[q.id]) {
      hsArea.addEventListener('click', function(e) {
        var rect = hsArea.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) * 100;
        var y = ((e.clientY - rect.top) / rect.height) * 100;
        quizAnswers[q.id] = { x: x, y: y };
        var submitBtn = document.getElementById('submit_' + q.id);
        if (submitBtn) submitBtn.style.display = 'inline-block';
        renderSlide();
      });
    }

    // Submit button
    var submitBtn = document.getElementById('submit_' + q.id);
    if (submitBtn) {
      submitBtn.addEventListener('click', function() {
        submittedQuizzes[q.id] = true;
        saveState();
        renderSlide();
      });
    }
  }

  function updateProgress() {
    var bar = document.getElementById('progress-bar');
    if (bar) {
      bar.style.width = ((currentSlide + 1) / totalSlides * 100) + '%';
    }
    var counter = document.getElementById('slide-counter');
    if (counter) {
      counter.textContent = 'Page ' + (currentSlide + 1) + ' of ' + totalSlides;
    }
    var pageIndicator = document.getElementById('page-indicator');
    if (pageIndicator) {
      pageIndicator.textContent = 'Page ' + (currentSlide + 1) + ' of ' + totalSlides;
    }
  }

  function updateNavigation() {
    var prevBtn = document.getElementById('btn-prev');
    var nextBtn = document.getElementById('btn-next');
    if (prevBtn) prevBtn.disabled = currentSlide === 0;
    if (nextBtn) {
      nextBtn.textContent = currentSlide === totalSlides - 1 ? 'Finish' : 'Next \\u203A';
    }
  }

  // Navigation
  window.goNext = function() {
    if (currentSlide < totalSlides - 1) {
      currentSlide++;
      renderSlide();
      renderSidebar();
      updateProgress();
      updateNavigation();
      saveState();
      if (isNarrating) startNarration();
    } else {
      stopNarration();
      finishCourse();
    }
  };

  window.goPrev = function() {
    if (currentSlide > 0) {
      currentSlide--;
      renderSlide();
      renderSidebar();
      updateProgress();
      updateNavigation();
      saveState();
      if (isNarrating) startNarration();
    }
  };

  function finishCourse() {
    // Track session time
    var elapsed = new Date() - startTime;
    ScormAPI.setSessionTime(elapsed);

    // Calculate score
    var allQuestions = [];
    COURSE_DATA.slides.forEach(function(s) {
      if (s.questions) allQuestions = allQuestions.concat(s.questions);
    });

    var totalPoints = 0;
    var earnedPoints = 0;
    allQuestions.forEach(function(q) {
      totalPoints += q.points;
      if (isQuestionCorrect(q)) earnedPoints += q.points;
    });

    var scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
    var passed = scorePercent >= COURSE_DATA.settings.passingScore;

    ScormAPI.setScore(scorePercent, 0, 100);

    var allVisited = visitedSlides.size >= totalSlides;
    var criteria = COURSE_DATA.settings.completionCriteria;
    var isComplete = false;
    if (criteria === 'all-slides') isComplete = allVisited;
    else if (criteria === 'passing-score') isComplete = passed;
    else isComplete = allVisited && passed;

    if (isComplete) {
      ScormAPI.finish(passed ? 'passed' : 'completed');
    } else {
      ScormAPI.finish(passed ? 'passed' : 'failed');
    }

    // Show results
    var container = document.getElementById('slide-content');
    container.style.backgroundColor = '#fff';
    container.style.backgroundImage = '';
    container.className = '';

    // Show certificate if enabled and passed
    if (COURSE_DATA.settings.showCertificate && passed) {
      var today = new Date();
      var dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      var certOrg = COURSE_DATA.settings.certificateOrg || '';
      var certTitle = COURSE_DATA.settings.certificateTitle || 'Certificate of Completion';
      var html = '<div class="certificate-wrapper">';
      html += '<div class="certificate-card">';
      html += '<div class="certificate-border">';
      html += '<div class="certificate-inner">';
      html += '<div class="certificate-badge">\\u{1F3C6}</div>';
      html += '<p class="certificate-label">' + escapeHtml(certTitle) + '</p>';
      html += '<h2 class="certificate-course">' + escapeHtml(COURSE_DATA.title) + '</h2>';
      html += '<div class="certificate-divider"></div>';
      html += '<div class="certificate-details">';
      html += '<div class="certificate-detail"><span class="certificate-detail-label">Score</span><span class="certificate-detail-value">' + scorePercent + '%</span></div>';
      html += '<div class="certificate-detail"><span class="certificate-detail-label">Date</span><span class="certificate-detail-value">' + dateStr + '</span></div>';
      if (certOrg) {
        html += '<div class="certificate-detail"><span class="certificate-detail-label">Organization</span><span class="certificate-detail-value">' + escapeHtml(certOrg) + '</span></div>';
      }
      html += '</div>';
      if (allQuestions.length > 0) {
        html += '<p class="certificate-points">' + earnedPoints + ' / ' + totalPoints + ' points earned</p>';
      }
      html += '<button class="certificate-print-btn" onclick="window.print()">\\u{1F5A8} Print Certificate</button>';
      html += '</div></div></div></div>';
      container.innerHTML = html;
    } else {
      // Standard results screen
      var html = '<div style="text-align:center;padding:3rem;">';
      html += '<div style="width:5rem;height:5rem;border-radius:50%;background:' +
        (passed ? '#ecfdf5' : '#fef2f2') + ';display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;">';
      html += '<span style="font-size:2.5rem;">' + (passed ? '\\u2713' : '\\u2717') + '</span></div>';
      html += '<h2 style="font-size:1.5rem;font-weight:700;color:#1e293b;margin-bottom:0.5rem;">' +
        (passed ? 'Congratulations!' : 'Keep Trying!') + '</h2>';
      html += '<p style="color:#64748b;margin-bottom:1.5rem;">' +
        (passed ? 'You have successfully completed this course.' : 'You need ' + COURSE_DATA.settings.passingScore + '% to pass.') + '</p>';

      if (allQuestions.length > 0) {
        html += '<div style="background:#f8fafc;border-radius:0.75rem;padding:1.5rem;max-width:16rem;margin:0 auto;">';
        html += '<div style="font-size:2.5rem;font-weight:700;color:' + (passed ? '#059669' : '#dc2626') + ';">' + scorePercent + '%</div>';
        html += '<p style="font-size:0.875rem;color:#64748b;">' + earnedPoints + ' / ' + totalPoints + ' points</p>';
        html += '<div style="width:100%;height:0.5rem;background:#e2e8f0;border-radius:9999px;margin-top:0.75rem;">';
        html += '<div style="height:100%;border-radius:9999px;width:' + scorePercent + '%;background:' + (passed ? '#059669' : '#dc2626') + ';"></div>';
        html += '</div></div>';
      }

      html += '</div>';
      container.innerHTML = html;
    }

    // Hide navigation
    var nav = document.getElementById('navigation');
    if (nav) nav.style.display = 'none';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
`;
}

function generateStyles(course: Course): string {
  const primary = course.settings.primaryColor || '#4f46e5';
  const font = course.settings.fontFamily || 'Inter';

  return `
@import url('https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: '${font}', system-ui, -apple-system, sans-serif;
  background: #f9fafb;
  color: #1e293b;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ========= Header ========= */
#header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

#btn-home {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 0.813rem;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  transition: all 0.15s;
}
#btn-home:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.header-sep {
  color: #d1d5db;
  font-size: 0.875rem;
}

#header h1 {
  color: #1e293b;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

#slide-counter {
  color: #6b7280;
  font-size: 0.813rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-narrate {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 4px 8px;
  border-radius: 6px;
  color: #6b7280;
  transition: all 0.15s;
  flex-shrink: 0;
  line-height: 1;
}
.btn-narrate:hover {
  background: #f1f5f9;
  color: #1e293b;
}
.btn-narrate.narrating {
  background: ${primary};
  color: #fff;
  animation: narration-pulse 1.5s ease-in-out infinite;
}
@keyframes narration-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* ========= Progress Bar ========= */
#progress-container {
  height: 3px;
  background: #e5e7eb;
  flex-shrink: 0;
}

#progress-bar {
  height: 100%;
  background: ${primary};
  transition: width 0.3s ease;
  width: 0%;
}

/* ========= Body: Sidebar + Main ========= */
#body {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

/* ========= Sidebar ========= */
#sidebar {
  width: 280px;
  min-width: 280px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  transition: width 0.2s ease, min-width 0.2s ease;
}
#sidebar.collapsed {
  width: 0;
  min-width: 0;
  border-right: none;
  overflow: hidden;
}
#sidebar.collapsed > * {
  display: none;
}

#sidebar-header {
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

#sidebar-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

#sidebar-collapse-btn {
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  color: #6b7280;
  cursor: pointer;
  font-size: 1rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  transition: all 0.15s;
}
#sidebar-collapse-btn:hover {
  background: #f3f4f6;
  color: #1e293b;
}

#sidebar-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.sidebar-section {
  border-bottom: 1px solid #f3f4f6;
}
.sidebar-section:last-child {
  border-bottom: none;
}

.sidebar-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}
.sidebar-section-header:hover {
  background: #f9fafb;
}

.sidebar-section-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.sidebar-section-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
}

.sidebar-section-title {
  font-size: 0.813rem;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-section-arrow {
  font-size: 0.625rem;
  color: #9ca3af;
  flex-shrink: 0;
  transition: transform 0.2s;
  margin-left: 8px;
}
.sidebar-section.open .sidebar-section-arrow {
  transform: rotate(90deg);
}

.sidebar-section-slides {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease;
}
.sidebar-section.open .sidebar-section-slides {
  max-height: 2000px;
}

.sidebar-slide {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 16px 7px 28px;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  cursor: pointer;
  text-align: left;
  font-size: 0.813rem;
  color: #4b5563;
  transition: all 0.1s;
}
.sidebar-slide:hover {
  background: #f9fafb;
}
.sidebar-slide.active {
  border-left-color: ${primary};
  background: #f0f5ff;
  color: ${primary};
  font-weight: 600;
}
.sidebar-slide.visited .sidebar-slide-icon {
  color: #10b981;
}

.sidebar-slide-icon {
  font-size: 0.75rem;
  flex-shrink: 0;
  width: 16px;
  text-align: center;
  color: #d1d5db;
}

.sidebar-slide-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.sidebar-progress {
  padding: 6px 16px;
  font-size: 0.688rem;
  color: #9ca3af;
}

#sidebar-footer {
  border-top: 1px solid #e5e7eb;
  padding: 10px 16px;
  flex-shrink: 0;
}

#sidebar-results-btn {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 0.813rem;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.15s;
}
#sidebar-results-btn:hover {
  color: ${primary};
}

/* Sidebar expand button (shown when collapsed) */
#sidebar-expand-btn {
  display: none;
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-left: none;
  border-radius: 0 6px 6px 0;
  width: 20px;
  height: 40px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 0.875rem;
  padding: 0;
  box-shadow: 2px 0 4px rgba(0,0,0,0.05);
}
#sidebar-expand-btn:hover {
  background: #f3f4f6;
  color: #1e293b;
}

/* ========= Main Content ========= */
#main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  min-width: 0;
}

#page-indicator {
  padding: 12px 2.5rem 0;
  font-size: 0.75rem;
  color: #9ca3af;
  flex-shrink: 0;
}

#slide-content {
  flex: 1;
  padding: 1rem 2.5rem 2rem;
  overflow-y: auto;
  overflow-x: hidden;
}

#slide-content h1 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; line-height: 1.2; }
#slide-content h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; }
#slide-content h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
#slide-content p { margin-bottom: 0.75rem; line-height: 1.7; }
#slide-content ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
#slide-content ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
#slide-content li { margin-bottom: 0.25rem; }
#slide-content blockquote { border-left: 4px solid ${primary}; padding-left: 1rem; font-style: italic; color: #64748b; margin: 1rem 0; }
#slide-content pre { background: #1e293b; color: #f8fafc; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin: 1rem 0; }
#slide-content code { font-family: 'Fira Code', monospace; font-size: 0.875rem; }
#slide-content a { color: ${primary}; text-decoration: underline; }
#slide-content img { max-width: 100%; height: auto; }

.content-block { margin-bottom: 1rem; }

/* ========= Navigation (inside main content) ========= */
#navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 2.5rem;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
  background: #fff;
}

.btn-prev, .btn-next {
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}

.btn-prev {
  background: #fff;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.btn-prev:hover:not(:disabled) {
  background: #f9fafb;
  color: #1e293b;
  border-color: #9ca3af;
}
.btn-prev:disabled { opacity: 0.3; cursor: not-allowed; }

.btn-next {
  background: ${primary};
  color: #fff;
  border: none;
}

.btn-next:hover { filter: brightness(1.1); }

.quiz-option:hover:not(:disabled) {
  border-color: ${primary} !important;
  background: #eef2ff !important;
}

/* Flip Cards */
.flip-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}
.flip-card {
  perspective: 800px;
  height: 200px;
  cursor: pointer;
}
.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}
.flip-card-front, .flip-card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  text-align: center;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.flip-card-front {
  background: #f8fafc;
}
.flip-card-back {
  background: ${primary};
  color: #fff;
  transform: rotateY(180deg);
}
.flip-card-img {
  max-width: 80%;
  max-height: 60%;
  object-fit: contain;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}
.flip-card-text {
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
}

/* Hotspot */
.hotspot-container {
  position: relative;
  display: inline-block;
  margin: 1rem 0;
  max-width: 100%;
}
.hotspot-img {
  display: block;
  max-width: 100%;
  border-radius: 0.75rem;
}
.hotspot-dot {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${primary};
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 2;
  padding: 0;
}
.hotspot-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid ${primary};
  animation: hotspot-pulse 2s infinite;
}
@keyframes hotspot-pulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}
.hotspot-tooltip, .labeled-tooltip {
  display: none;
  position: absolute;
  background: #1e293b;
  color: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.813rem;
  max-width: 220px;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  left: 50%;
  transform: translateX(-50%);
  top: calc(100% + 10px);
  pointer-events: auto;
}
.hotspot-tooltip.visible, .labeled-tooltip.visible {
  display: block;
}
.hotspot-tooltip p, .labeled-tooltip p {
  margin: 0.25rem 0 0;
  font-weight: 400;
  opacity: 0.85;
}

/* Accordion */
.accordion {
  margin: 1rem 0;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
}
.accordion-item {
  border-bottom: 1px solid #e2e8f0;
}
.accordion-item:last-child {
  border-bottom: none;
}
.accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.875rem 1rem;
  background: #f8fafc;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  color: #1e293b;
  text-align: left;
  transition: background 0.15s;
}
.accordion-header:hover {
  background: #f1f5f9;
}
.accordion-arrow {
  font-size: 0.625rem;
  transition: transform 0.2s;
  color: #94a3b8;
}
.accordion-item.open .accordion-arrow {
  transform: rotate(90deg);
}
.accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.accordion-item.open .accordion-content {
  max-height: 1000px;
}
.accordion-body {
  padding: 1rem;
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.6;
}

/* Tabs */
.tabs-container {
  margin: 1rem 0;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
}
.tabs-nav {
  display: flex;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}
.tab-btn {
  padding: 0.75rem 1.25rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.tab-btn:hover {
  color: #1e293b;
}
.tab-btn.active {
  color: ${primary};
  border-bottom-color: ${primary};
  background: #fff;
}
.tab-panel {
  display: none;
  padding: 1.25rem;
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.6;
}
.tab-panel.active {
  display: block;
}

/* Timeline */
.timeline {
  position: relative;
  margin: 1.5rem 0;
  padding-left: 2rem;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e2e8f0;
}
.timeline-item {
  position: relative;
  margin-bottom: 1.5rem;
}
.timeline-dot {
  position: absolute;
  left: -2rem;
  top: 0.25rem;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${primary};
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px ${primary};
  z-index: 1;
}
.timeline-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
}
.timeline-date {
  font-size: 0.75rem;
  color: ${primary};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.timeline-title {
  font-size: 0.938rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0.25rem 0;
}
.timeline-desc {
  font-size: 0.813rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

/* Callout */
.callout {
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
}
.callout-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.938rem;
}
.callout-icon {
  font-size: 1.125rem;
}
.callout-body {
  font-size: 0.875rem;
  line-height: 1.6;
  color: inherit;
}
.callout-body p {
  margin: 0;
}

/* Table */
.table-wrapper {
  margin: 1rem 0;
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
}
.scorm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.scorm-table th {
  background: #f1f5f9;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 2px solid #e2e8f0;
}
.scorm-table td {
  padding: 0.625rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  color: #475569;
}
.scorm-table.striped tbody tr:nth-child(even) {
  background: #f8fafc;
}

/* Button */
.scorm-btn {
  display: inline-block;
  padding: 0.625rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.scorm-btn-primary {
  background: ${primary};
  color: #fff;
}
.scorm-btn-primary:hover { filter: brightness(1.1); }
.scorm-btn-secondary {
  background: #f1f5f9;
  color: #1e293b;
}
.scorm-btn-secondary:hover { background: #e2e8f0; }
.scorm-btn-outline {
  background: transparent;
  border: 2px solid ${primary};
  color: ${primary};
}
.scorm-btn-outline:hover { background: ${primary}; color: #fff; }
.scorm-btn-link {
  background: transparent;
  color: ${primary};
  text-decoration: underline;
  padding-left: 0;
  padding-right: 0;
}

/* Audio */
.audio-block {
  margin: 1rem 0;
}
.audio-block audio {
  width: 100%;
  border-radius: 0.5rem;
}

/* Embed */
.embed-block {
  margin: 1rem 0;
  border-radius: 0.5rem;
  overflow: hidden;
}

/* Gallery */
.gallery-grid {
  display: grid;
  gap: 0.75rem;
  margin: 1rem 0;
}
.gallery-item {
  overflow: hidden;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}
.gallery-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
}
.gallery-caption {
  font-size: 0.75rem;
  color: #64748b;
  padding: 0.5rem 0.625rem;
  margin: 0;
}

/* Image Layout Blocks */
.layout-img {
  width: 100%;
  border-radius: 0.75rem;
  object-fit: cover;
  display: block;
}
.layout-img-placeholder {
  width: 100%;
  height: 12rem;
  background: #f1f5f9;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.layout-caption {
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
  margin-top: 0.25rem;
}
.layout-text {
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
}
.layout-image-top,
.layout-image-bottom {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.layout-image-left,
.layout-image-right {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}
.layout-side-img {
  width: 40%;
  flex-shrink: 0;
}
.layout-side-text {
  width: 60%;
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
}
.layout-two-images {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.layout-three-images {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
}
.layout-multi-item {
  display: flex;
  flex-direction: column;
}

/* Labeled Graphic */
.labeled-graphic-container {
  position: relative;
  display: inline-block;
  margin: 1rem 0;
  max-width: 100%;
}
.labeled-graphic-img {
  display: block;
  max-width: 100%;
  border-radius: 0.75rem;
}
.labeled-marker {
  position: absolute;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transform: translate(-50%, -50%);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  padding: 0;
}

/* Drag Sort */
.drag-sort-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.drag-sort-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.15s;
  user-select: none;
}
.drag-sort-item[draggable="true"] {
  cursor: grab;
}
.drag-sort-item.dragging {
  opacity: 0.5;
  background: #f1f5f9 !important;
}
.drag-sort-handle {
  font-size: 1.25rem;
  color: #94a3b8;
  line-height: 1;
}
.drag-sort-num {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  flex-shrink: 0;
}

/* Likert */
.likert-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.likert-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.813rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  flex: 1;
  min-width: 6rem;
  text-align: center;
}
.likert-btn:hover:not(:disabled) {
  border-color: ${primary} !important;
  background: #eef2ff !important;
}
.likert-btn:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

/* Rating */
.rating-row {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}
.rating-star {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.5rem;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}
.rating-star:hover:not(:disabled) {
  border-color: ${primary} !important;
  transform: scale(1.1);
}
.rating-star:disabled {
  cursor: not-allowed;
}
.rating-row[data-style="emoji"] .rating-star {
  font-size: 1.5rem;
  width: 3rem;
  height: 3rem;
}
.rating-row[data-style="stars"] .rating-star {
  font-size: 1.5rem;
  color: #f59e0b;
}

/* Slider */
.slider-container {
  padding: 0.5rem 0;
}
.slider-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.813rem;
  color: #64748b;
}
.slider-value {
  font-weight: 700;
  font-size: 1.125rem;
  color: ${primary};
}
.slider-input {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 9999px;
  background: #e2e8f0;
  outline: none;
  cursor: pointer;
}
.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${primary};
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}
.slider-input::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${primary};
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

/* Image Choice */
.image-choice-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.image-choice-card {
  position: relative;
  border-radius: 0.75rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.image-choice-card:hover:not(:disabled) {
  border-color: ${primary} !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.image-choice-card:disabled {
  cursor: not-allowed;
}
.image-choice-img {
  width: 100%;
  height: 8rem;
  object-fit: cover;
  border-radius: 0.5rem;
}
.image-choice-label {
  font-size: 0.813rem;
  font-weight: 500;
  color: #475569;
}
.image-choice-check {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: ${primary};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Matrix Table */
.matrix-table-wrap {
  overflow-x: auto;
}
.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
}
.matrix-table th {
  background: #f1f5f9;
  padding: 0.625rem 1rem;
  text-align: center;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 2px solid #e2e8f0;
  font-size: 0.813rem;
}
.matrix-table td {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  text-align: center;
}
.matrix-row-label {
  text-align: left !important;
  font-weight: 500;
  color: #334155;
}
.matrix-cell {
  vertical-align: middle;
}
.matrix-radio {
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
  accent-color: ${primary};
}
.matrix-correct {
  background: #ecfdf5;
}
.matrix-incorrect {
  background: #fef2f2;
}
.matrix-expected {
  background: #ecfdf540;
}

/* Dropdown */
.dropdown-select {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: #fff;
  color: #1e293b;
  outline: none;
  cursor: pointer;
  appearance: auto;
}
.dropdown-select:focus {
  border-color: ${primary};
}

/* Open-ended */
.open-ended-textarea {
  width: 100%;
  min-height: 6rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  outline: none;
  background: #fff;
  color: #1e293b;
  line-height: 1.6;
}
.open-ended-textarea:focus {
  border-color: ${primary};
}
.open-ended-counter {
  text-align: right;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

/* Ranking */
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.ranking-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.15s;
}
.ranking-num {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  flex-shrink: 0;
}
.ranking-text {
  flex: 1;
}
.ranking-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.ranking-up, .ranking-down {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  width: 1.5rem;
  height: 1.25rem;
  font-size: 0.625rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  padding: 0;
  transition: all 0.15s;
}
.ranking-up:hover:not(:disabled), .ranking-down:hover:not(:disabled) {
  background: ${primary};
  color: #fff;
  border-color: ${primary};
}
.ranking-up:disabled, .ranking-down:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Hotspot Question */
.hotspot-click-area {
  position: relative;
  display: inline-block;
  margin: 0.5rem 0;
  max-width: 100%;
  cursor: crosshair;
}
.hotspot-click-img {
  display: block;
  max-width: 100%;
  border-radius: 0.75rem;
}
.hotspot-click-marker {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
}
.hotspot-zone-hint {
  position: absolute;
  border: 2px dashed #10b981;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.5;
  pointer-events: none;
  z-index: 2;
}

/* ========= Entrance Animations ========= */
@keyframes anim-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes anim-slide-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes anim-slide-left {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes anim-slide-right {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes anim-zoom-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes anim-bounce-in {
  0% { opacity: 0; transform: scale(0.3); }
  60% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}

.animated {
  opacity: 0;
}
.animated.in-view[data-animation="fade-in"] {
  animation: anim-fade-in 0.6s ease-out forwards;
}
.animated.in-view[data-animation="slide-up"] {
  animation: anim-slide-up 0.6s ease-out forwards;
}
.animated.in-view[data-animation="slide-left"] {
  animation: anim-slide-left 0.6s ease-out forwards;
}
.animated.in-view[data-animation="slide-right"] {
  animation: anim-slide-right 0.6s ease-out forwards;
}
.animated.in-view[data-animation="zoom-in"] {
  animation: anim-zoom-in 0.5s ease-out forwards;
}
.animated.in-view[data-animation="bounce-in"] {
  animation: anim-bounce-in 0.6s ease-out forwards;
}

/* ========= Slide Transitions ========= */
.slide-transition-fade {
  opacity: 0;
  transition: opacity 0.4s ease;
}
.slide-transition-fade.slide-transition-active {
  opacity: 1;
}
.slide-transition-slide-left {
  opacity: 0;
  transform: translateX(40px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.slide-transition-slide-left.slide-transition-active {
  opacity: 1;
  transform: translateX(0);
}
.slide-transition-slide-up {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.slide-transition-slide-up.slide-transition-active {
  opacity: 1;
  transform: translateY(0);
}
.slide-transition-zoom {
  opacity: 0;
  transform: scale(0.92);
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.slide-transition-zoom.slide-transition-active {
  opacity: 1;
  transform: scale(1);
}

/* ========= Cover Slide ========= */
.cover-slide {
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  border-radius: 1rem;
}
.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 100%);
  z-index: 1;
}
.cover-content {
  position: relative;
  z-index: 2;
  padding: 3rem 2rem;
}
.cover-title {
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 0.75rem;
  text-shadow: 0 2px 12px rgba(0,0,0,0.3);
}
.cover-subtitle {
  font-size: 1.25rem;
  color: rgba(255,255,255,0.85);
  margin-bottom: 1.5rem;
  font-weight: 400;
}
.cover-meta {
  font-size: 0.875rem;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
}

/* ========= Learning Objectives ========= */
.objectives-box {
  background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
  border: 1px solid #bfdbfe;
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
}
.objectives-header {
  font-weight: 700;
  font-size: 0.938rem;
  color: #1e40af;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.objectives-icon {
  font-size: 1.125rem;
}
.objectives-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.objectives-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #334155;
  line-height: 1.6;
  margin-bottom: 0.375rem;
}
.objectives-check {
  color: #10b981;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

/* ========= Completion Certificate ========= */
.certificate-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 400px;
}
.certificate-card {
  width: 100%;
  max-width: 32rem;
}
.certificate-border {
  background: linear-gradient(135deg, ${primary}, #a855f7, #ec4899, ${primary});
  border-radius: 1rem;
  padding: 4px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
}
.certificate-inner {
  background: #fff;
  border-radius: 0.875rem;
  padding: 2.5rem 2rem;
  text-align: center;
}
.certificate-badge {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
.certificate-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #94a3b8;
  font-weight: 700;
  margin-bottom: 0.75rem;
}
.certificate-course {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 1rem;
  line-height: 1.3;
}
.certificate-divider {
  width: 4rem;
  height: 3px;
  background: linear-gradient(90deg, ${primary}, #a855f7);
  margin: 0 auto 1.25rem;
  border-radius: 9999px;
}
.certificate-details {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.certificate-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.certificate-detail-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  font-weight: 600;
  margin-bottom: 0.125rem;
}
.certificate-detail-value {
  font-size: 0.938rem;
  font-weight: 700;
  color: #1e293b;
}
.certificate-points {
  font-size: 0.813rem;
  color: #64748b;
  margin-bottom: 1.25rem;
}
.certificate-print-btn {
  display: inline-block;
  padding: 0.625rem 1.5rem;
  background: ${primary};
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
}
.certificate-print-btn:hover {
  filter: brightness(1.1);
}

/* ========= Landing Page ========= */
#landing-page {
  position: fixed;
  inset: 0;
  z-index: 100;
  overflow: hidden;
}
.landing-page {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  width: 100%;
}
.landing-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 40%;
  min-height: 100vh;
  padding: 2.5rem 3rem;
  overflow: hidden;
}
.landing-hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.landing-hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
.landing-logo {
  margin-bottom: 1.5rem;
}
.landing-logo-img {
  height: 2.5rem;
  width: auto;
  object-fit: contain;
}
.landing-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem 0;
}
.landing-title {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 1rem;
}
.landing-tagline {
  font-size: 1.125rem;
  opacity: 0.8;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}
.landing-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  opacity: 0.75;
  margin-bottom: 2rem;
}
.landing-progress {
  margin-bottom: 2rem;
}
.landing-progress-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
  display: block;
  margin-bottom: 0.5rem;
}
.landing-progress-track {
  width: 100%;
  height: 6px;
  border-radius: 9999px;
  overflow: hidden;
}
.landing-progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.5s;
}
.landing-start-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 1rem;
  color: #fff;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.2s;
  width: fit-content;
}
.landing-start-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
}
.landing-company {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.landing-company-logo {
  height: 2rem;
  width: auto;
  object-fit: contain;
}
.landing-company-name {
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0.6;
}

/* Right panel: module list */
.landing-modules {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 60%;
  background: #f8fafc;
}
.landing-modules-header {
  padding: 2.5rem 3rem 1rem;
}
.landing-modules-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}
.landing-modules-header p {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}
.landing-modules-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 3rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.landing-footer {
  padding: 1rem 3rem;
  text-align: right;
  font-size: 0.75rem;
  color: #cbd5e1;
}

/* Module card */
.module-card {
  display: block;
  width: 100%;
  text-align: left;
  background: #fff;
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  padding: 0;
}
.module-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  border-color: #cbd5e1;
  transform: translateY(-2px);
}
.module-card-inner {
  display: flex;
  align-items: stretch;
}
.module-card-thumb {
  position: relative;
  width: 10rem;
  flex-shrink: 0;
  min-height: 7.5rem;
}
.module-card-thumb-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.module-card-thumb-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: rgba(255,255,255,0.8);
}
.module-card-badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
}
.module-card-content {
  flex: 1;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 7.5rem;
}
.module-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.25rem;
  line-height: 1.3;
}
.module-card-desc {
  font-size: 0.813rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.module-card-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.75rem;
}

/* ========= Scenario ========= */
.scenario-container {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin: 1rem 0;
}
.scenario-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}
.scenario-desc {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.75rem;
}
.scenario-img {
  width: 100%;
  max-height: 12rem;
  object-fit: cover;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
}
.scenario-step-indicator {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}
.scenario-step-content p {
  font-size: 0.938rem;
  color: #1e293b;
  line-height: 1.6;
  margin-bottom: 1rem;
}
.scenario-feedback {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #1e40af;
  margin-bottom: 1rem;
}
.scenario-choices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.scenario-choice-btn {
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 2px solid #e2e8f0;
  background: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}
.scenario-choice-btn:hover {
  border-color: ${primary};
  background: #eef2ff;
}
.scenario-end {
  text-align: center;
  padding: 2rem 1rem;
  border-radius: 0.5rem;
}
.scenario-end-success { background: #ecfdf5; border: 1px solid #a7f3d0; }
.scenario-end-failure { background: #fef2f2; border: 1px solid #fecaca; }
.scenario-end-neutral { background: #f8fafc; border: 1px solid #e2e8f0; }
.scenario-end-label {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.scenario-end-success .scenario-end-label { color: #059669; }
.scenario-end-failure .scenario-end-label { color: #dc2626; }
.scenario-end-neutral .scenario-end-label { color: #475569; }
.scenario-end-msg {
  font-size: 0.875rem;
  color: #4b5563;
  margin-bottom: 1rem;
}
.scenario-restart-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #fff;
  border: 1px solid #d1d5db;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}
.scenario-restart-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* ========= Checklist ========= */
.checklist-container {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin: 1rem 0;
}
.checklist-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
}
.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.625rem 0;
  cursor: pointer;
  transition: all 0.15s;
  border-bottom: 1px solid #f1f5f9;
}
.checklist-item:last-of-type {
  border-bottom: none;
}
.checklist-item:hover {
  background: #f9fafb;
  margin: 0 -0.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  border-radius: 0.375rem;
}
.checklist-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.25rem;
  border: 2px solid #d1d5db;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  margin-top: 0.125rem;
}
.checklist-check-icon {
  width: 0.75rem;
  height: 0.75rem;
  display: none;
  color: #fff;
}
.checklist-item.checked .checklist-checkbox {
  background: #10b981;
  border-color: #10b981;
}
.checklist-item.checked .checklist-check-icon {
  display: block;
}
.checklist-item.checked .checklist-item-title {
  text-decoration: line-through;
  color: #94a3b8;
}
.checklist-item-content {
  display: flex;
  flex-direction: column;
}
.checklist-item-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  transition: all 0.15s;
}
.checklist-item-desc {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.125rem;
}
.checklist-progress {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.75rem;
}

/* ========= Card Sorting ========= */
.card-sort-container {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin: 1rem 0;
}
.card-sort-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
}
.card-sort-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}
.card-sort-pile {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.card-sort-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}
.card-sort-card-text {
  font-size: 0.875rem;
  color: #374151;
  display: block;
  margin-bottom: 0.375rem;
}
.card-sort-card-buttons {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}
.card-sort-assign-btn {
  font-size: 0.625rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  background: #eff6ff;
  color: ${primary};
  border: 1px solid #bfdbfe;
  cursor: pointer;
  transition: all 0.15s;
}
.card-sort-assign-btn:hover {
  background: ${primary};
  color: #fff;
  border-color: ${primary};
}
.card-sort-bins {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.card-sort-bin {
  border: 2px dashed #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.75rem;
  min-height: 5rem;
}
.card-sort-bin-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 0.5rem;
}
.card-sort-bin-cards {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.card-sort-bin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: ${primary};
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
}
.card-sort-bin-card.correct {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #059669;
}
.card-sort-bin-card.incorrect {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}
.card-sort-remove-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0 0.25rem;
}
.card-sort-remove-btn:hover {
  color: #ef4444;
}
.card-sort-result {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  padding: 0.5rem;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
}
.card-sort-correct {
  background: #ecfdf5;
  color: #059669;
}
.card-sort-incorrect {
  background: #fef2f2;
  color: #dc2626;
}
.card-sort-actions {
  display: flex;
  gap: 0.5rem;
}
.card-sort-check-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: ${primary};
  color: #fff;
  border: none;
  cursor: pointer;
  transition: filter 0.15s;
}
.card-sort-check-btn:hover {
  filter: brightness(1.1);
}
.card-sort-reset-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #fff;
  border: 1px solid #d1d5db;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}
.card-sort-reset-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* ========= Responsive / Mobile ========= */
@media (max-width: 768px) {
  #sidebar {
    display: none;
  }
  #sidebar-expand-btn {
    display: none !important;
  }
  #slide-content {
    padding: 1.25rem;
  }
  #page-indicator {
    padding: 10px 1.25rem 0;
  }
  #navigation {
    padding: 12px 1.25rem;
  }
  #slide-content h1 {
    font-size: 1.375rem;
  }
  #slide-content h2 {
    font-size: 1.125rem;
  }
  #slide-content p, #slide-content li {
    font-size: 0.875rem;
  }
  .flip-card-grid {
    grid-template-columns: 1fr !important;
  }
  .table-wrapper {
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .scorm-table {
    min-width: 480px;
  }
  .gallery-grid {
    grid-template-columns: 1fr 1fr !important;
  }
  .image-choice-grid {
    grid-template-columns: 1fr 1fr !important;
  }
  .likert-row {
    flex-direction: column;
  }
  .likert-btn {
    min-width: auto;
  }
  .matrix-table {
    min-width: 400px;
  }
  .two-col-grid {
    grid-template-columns: 1fr !important;
  }
  .cover-title {
    font-size: 1.75rem;
  }
  .cover-subtitle {
    font-size: 1rem;
  }
  .certificate-inner {
    padding: 1.5rem 1rem;
  }
  .certificate-details {
    gap: 1rem;
  }
  #header h1 {
    font-size: 0.75rem;
  }
  .btn-prev, .btn-next {
    padding: 0.375rem 0.875rem;
    font-size: 0.813rem;
  }
  .objectives-box {
    padding: 1rem;
  }
  .timeline {
    padding-left: 1.5rem;
  }
  /* Landing page mobile */
  .landing-page {
    flex-direction: column;
  }
  .landing-hero {
    width: 100%;
    min-height: 50vh;
    padding: 2rem;
  }
  .landing-modules {
    width: 100%;
  }
  .landing-modules-header {
    padding: 1.5rem 1.5rem 0.75rem;
  }
  .landing-modules-list {
    padding: 0 1.5rem 1.5rem;
  }
  .landing-title {
    font-size: 1.75rem;
  }
  .module-card-thumb {
    width: 6rem;
  }
  .landing-footer {
    padding: 0.75rem 1.5rem;
  }
}

@media print {
  body { background: #fff; }
  #header, #navigation, #progress-container, #sidebar { display: none !important; }
  #slide-content {
    padding: 1rem;
  }
}
`;
}

function generateIndexHtml(course: Course): string {
  return `<!DOCTYPE html>
<html lang="${course.language || 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(course.title)}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="header">
    <div class="header-left">
      ${course.settings.landingPage.enabled ? '<button id="btn-home" onclick="_showLanding()" title="Back to landing page">&#x2302; Home</button><span class="header-sep">|</span>' : ''}
      <h1>${escapeHtml(course.title)}</h1>
    </div>
    <span id="slide-counter">Page 1 of 1</span>
    <button id="btn-narrate" class="btn-narrate" onclick="window._toggleNarration()" title="Read aloud">&#x1F50A;</button>
  </div>
  <div id="progress-container">
    <div id="progress-bar"></div>
  </div>
  <div id="body">
    <div id="sidebar">
      <div id="sidebar-header">
        <span id="sidebar-title">${escapeHtml(course.title)}</span>
        <button id="sidebar-collapse-btn" title="Collapse sidebar">&#x2039;</button>
      </div>
      <div id="sidebar-tree"></div>
      <div id="sidebar-footer">
        <button id="sidebar-results-btn" onclick="window._showResults && window._showResults()">Results</button>
      </div>
    </div>
    <div id="main-content">
      <div id="page-indicator">Page 1 of 1</div>
      <div id="slide-content"></div>
      <div id="navigation">
        <button id="btn-prev" class="btn-prev" onclick="goPrev()">&lsaquo; Previous</button>
        <button id="btn-next" class="btn-next" onclick="goNext()">Next &rsaquo;</button>
      </div>
    </div>
  </div>
  <script src="scorm-api.js"></script>
  <script src="course-data.js"></script>
  <script src="player.js"></script>
</body>
</html>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportScorm(course: Course, version: ScormVersion, packageName?: string): Promise<void> {
  const zip = new JSZip();
  const contentFolder = zip.folder('content')!;

  // Generate manifest
  const manifest = version === '1.2' ? generateManifest12(course) : generateManifest2004(course);
  zip.file('imsmanifest.xml', manifest);

  // Generate SCORM API wrapper
  const scormApi = version === '1.2' ? generateScormApi12() : generateScormApi2004();
  contentFolder.file('scorm-api.js', scormApi);

  // Generate course data
  contentFolder.file('course-data.js', generateCourseData(course));

  // Generate player
  contentFolder.file('player.js', generatePlayer());

  // Generate styles
  contentFolder.file('styles.css', generateStyles(course));

  // Generate index.html
  contentFolder.file('index.html', generateIndexHtml(course));

  // Generate ZIP
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const filename = (packageName || course.title.replace(/[^a-z0-9]/gi, '_')) + `_SCORM_${version}.zip`;
  saveAs(blob, filename);
}
