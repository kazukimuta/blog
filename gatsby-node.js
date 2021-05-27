/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

// You can delete this file if you're not using it

const path = require('path')

const createPages = async ({ actions, graphql }) => {
  const { createPage } = actions

  const blogPostTemplate = path.resolve(`src/templates/blogTemplate.js`)
  const bookTemplate = path.resolve(`src/templates/bookTemplate.js`)

  const result = await graphql(`
    {
      allMarkdownRemark(
        sort: { order: DESC, fields: [frontmatter___date] }
        limit: 1000
      ) {
        edges {
          node {
            frontmatter {
              path
              type
              tags
            }
          }
        }
      }
    }
  `)

  if (result.errors) {
    return Promise.reject(result.errors)
  }

  result.data.allMarkdownRemark.edges.forEach(({ node }) => {
    let component
    switch (node.frontmatter.type) {
      case 'book':
        component = bookTemplate
        break
      case 'page':
        component = blogPostTemplate
        break
      default:
        component = blogPostTemplate
        break
    }
    createPage({
      path: node.frontmatter.path,
      component,
      context: {}, // additional data can be passed via context
    })
  })
}

exports.createPages = createPages
