#!/usr/bin/env node

/**
 * mobiledoc → Markdown/HTML 変換スクリプト
 *
 * Ghost の mobiledoc 形式を Markdown および HTML に変換
 *
 * 使用方法:
 *   node scripts/convert-mobiledoc.js \
 *     --input ./migration-data/posts.json \
 *     --output ./migration-data/posts-converted.json
 */

const fs = require('fs');
const path = require('path');

// コマンドライン引数のパース
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    input: null,
    output: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      config.input = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      config.output = args[i + 1];
      i++;
    }
  }

  if (!config.input || !config.output) {
    console.error('使用方法: node convert-mobiledoc.js --input <INPUT_FILE> --output <OUTPUT_FILE>');
    process.exit(1);
  }

  return config;
}

// mobiledoc を Markdown/HTML に変換
function convertMobiledoc(mobiledocStr) {
  if (!mobiledocStr) {
    return { markdown: '', html: '' };
  }

  try {
    const mobiledoc = JSON.parse(mobiledocStr);
    let markdown = '';
    let html = '';

    // カードベースのコンテンツを処理
    if (mobiledoc.cards && Array.isArray(mobiledoc.cards)) {
      mobiledoc.cards.forEach(([type, payload]) => {
        switch (type) {
          case 'markdown':
            if (payload.markdown) {
              markdown += payload.markdown + '\n\n';
            }
            break;

          case 'html':
            if (payload.html) {
              html += payload.html + '\n\n';
              // HTML を Markdown 風に変換（簡易版）
              markdown += convertHtmlToMarkdown(payload.html) + '\n\n';
            }
            break;

          case 'image':
            if (payload.src) {
              const caption = payload.caption || '';
              markdown += `![${caption}](${payload.src})\n`;
              if (caption) {
                markdown += `*${caption}*\n`;
              }
              markdown += '\n';

              html += `<figure>\n`;
              html += `  <img src="${payload.src}" alt="${caption}" />\n`;
              if (caption) {
                html += `  <figcaption>${caption}</figcaption>\n`;
              }
              html += `</figure>\n\n`;
            }
            break;

          case 'code':
            const language = payload.language || '';
            const code = payload.code || '';
            markdown += '```' + language + '\n' + code + '\n```\n\n';
            html += `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>\n\n`;
            break;

          case 'embed':
            if (payload.html) {
              html += `<div class="embed">\n${payload.html}\n</div>\n\n`;
              markdown += `<!-- Embed: ${payload.url || 'unknown'} -->\n\n`;
            }
            break;

          case 'hr':
            markdown += '---\n\n';
            html += '<hr />\n\n';
            break;

          default:
            console.warn(`  ⚠️  未対応のカードタイプ: ${type}`);
        }
      });
    }

    // sections ベースのコンテンツを処理（古い形式）
    if (mobiledoc.sections && Array.isArray(mobiledoc.sections)) {
      mobiledoc.sections.forEach(section => {
        if (Array.isArray(section)) {
          const [type, tagName, markers] = section;

          if (type === 1) {
            // マークアップセクション
            let text = '';
            if (Array.isArray(markers)) {
              markers.forEach(marker => {
                if (Array.isArray(marker) && marker.length > 3) {
                  text += marker[3];
                }
              });
            }
            markdown += text + '\n\n';
            html += `<${tagName}>${text}</${tagName}>\n`;
          }
        }
      });
    }

    return {
      markdown: markdown.trim(),
      html: html.trim(),
    };
  } catch (e) {
    console.error(`  ❌ mobiledoc 解析エラー: ${e.message}`);
    return { markdown: '', html: '' };
  }
}

// 簡易的な HTML → Markdown 変換
function convertHtmlToMarkdown(html) {
  let md = html;

  // 基本的なタグを変換
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n');

  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');

  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');

  // HTMLタグを除去
  md = md.replace(/<\/?[^>]+(>|$)/g, '');

  // HTML エンティティをデコード
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&quot;/g, '"');

  return md.trim();
}

// HTML エスケープ
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 記事の変換処理
function convertPosts(posts) {
  console.log(`📝 ${posts.length} 件の記事を変換中...\n`);

  let successCount = 0;
  let fallbackCount = 0;
  let emptyCount = 0;

  const convertedPosts = posts.map((post, index) => {
    const { mobiledoc, html: existingHtml } = post;

    // mobiledoc を変換
    const { markdown, html } = convertMobiledoc(mobiledoc);

    // フォールバック処理
    let finalMarkdown = markdown;
    let finalHtml = html;

    if (!finalMarkdown && !finalHtml) {
      if (existingHtml) {
        // 既存の HTML をフォールバックとして使用
        finalHtml = existingHtml;
        finalMarkdown = convertHtmlToMarkdown(existingHtml);
        fallbackCount++;
      } else {
        emptyCount++;
      }
    } else {
      successCount++;
    }

    // 進捗表示
    if ((index + 1) % 10 === 0 || index + 1 === posts.length) {
      process.stdout.write(`  進捗: ${index + 1}/${posts.length}\r`);
    }

    return {
      ...post,
      content: finalMarkdown,
      html: finalHtml,
      // mobiledoc は削除（サイズ削減）
      mobiledoc: undefined,
    };
  });

  console.log('\n');
  console.log(`  ✓ 正常変換: ${successCount} 件`);
  console.log(`  ⚠️  フォールバック: ${fallbackCount} 件`);
  if (emptyCount > 0) {
    console.log(`  ❌ 空コンテンツ: ${emptyCount} 件`);
  }

  return convertedPosts;
}

// メイン処理
function main() {
  console.log('🔄 mobiledoc 変換スクリプト\n');

  const config = parseArgs();

  // 入力ファイル読み込み
  if (!fs.existsSync(config.input)) {
    console.error(`エラー: 入力ファイルが見つかりません: ${config.input}`);
    process.exit(1);
  }

  console.log(`📂 入力: ${config.input}`);
  console.log(`💾 出力: ${config.output}\n`);

  const posts = JSON.parse(fs.readFileSync(config.input, 'utf-8'));

  // 変換実行
  const convertedPosts = convertPosts(posts);

  // 出力
  const outputDir = path.dirname(config.output);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(config.output, JSON.stringify(convertedPosts, null, 2));

  console.log(`\n✅ 変換完了: ${config.output}`);
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { convertMobiledoc, convertHtmlToMarkdown };
