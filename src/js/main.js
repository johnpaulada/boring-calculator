if(navigator.serviceWorker) {
  navigator.serviceWorker.register('/sw.js')
  .catch(function(err) {
    console.error('Unable to register service worker.', err);
  });
}

// Define token types
const NUMBER = Symbol.for('NUMBER'),
      PLUS   = Symbol.for('PLUS'),
      MINUS  = Symbol.for('MINUS'),
      TIMES  = Symbol.for('TIMES'),
      DIVIDE = Symbol.for('DIVIDE'),
      EOF    = Symbol.for('EOF')

const tokenTypes = {'+': PLUS, '-': MINUS, 'x': TIMES, '/': DIVIDE}
const generateToken = (type, lexeme, value) => ({type, lexeme, value})
const printToken = token => `${token.type}: ${lexeme}`
const isDigit = char => char >= "0" && char <= "9"

const tokenize = input => {
  let start   = 0,
      current = 0,
      token   = null,
      tokens  = []

  const INPUT_LENGTH = input.length,
        isAtEnd      = () => current >= INPUT_LENGTH,
        createToken  = (type, value = null) => generateToken(type, input.substring(start, current), value),
        eat          = () => input.charAt(current++),
        peek         = () => isAtEnd() ? null : input.charAt(current),
        peekNext     = () => (current + 1) >= length ? null : input.charAt(current + 1),
        eatNumber    = () => { while (isDigit(peek()) && peek() !== null) eat() }

  const number = () => {
    eatNumber()
    
    if (peek() == '.' && isDigit(peekNext())) {
      eat()
      eatNumber()
    }

    return createToken(NUMBER, parseFloat(input.substring(start, current)))
  }

  const scanToken = () => {
    const char = eat()

    if (char in tokenTypes) {
      return createToken(tokenTypes[char])
    } else {
      switch(char){
        case ' ':
          return null
        default:
          if (isDigit(char)) {
            return number()
          } else {
            throw `Invalid character: ${char}`
          }
      }
    }
  }

  while (!isAtEnd(current)) {
    start  = current
    token  = scanToken()
    if (token) tokens = [...tokens, token]
  }

  return [...tokens, createToken(EOF)]
}

const parse = tokens => {
  let start   = 0,
      current = 0

  const peek     = () => tokens[current],
        previous = () => tokens[current - 1],
        eat      = () => tokens[current++],
        isAtEnd  = () => peek().type == EOF,
        check    = type => isAtEnd() ? false : peek().type == type

  const match = (...typesToMatch) => {
    if (typesToMatch.some(check)) {
      eat()
      return true
    } else {
      return false
    }
  }

  const createBinary = (left, operator, right) => {
    return {
      type: "binary",
      value: operator,
      left, right
    }
  }

  const createLiteral = value => {
    return {
      type: "literal",
      value
    }
  }

  const primary = () => {
    if (match(NUMBER)) return createLiteral(previous().value)
  }

  const multiplication = () => {
    let expr = primary()

    while (match(TIMES, DIVIDE)) {
      const operator = previous()
      const right = primary()

      expr = createBinary(expr, operator, right)
    }

    return expr
  }

  const addition = () => {
    let expr = multiplication()

    while (match(PLUS, MINUS)) {
      const operator = previous()
      const right = multiplication()

      expr =  createBinary(expr, operator, right)
    }

    return expr
  }
  
  const expression = addition

  return expression()
}

const evaluate = (ast) => {
  const left = ast.type === 'literal' ? null : evaluate(ast.left)
  const right = ast.type === 'literal' ? null : evaluate(ast.right)

  if (ast.type === 'binary') {
    switch(ast.value.type) {
      case PLUS:
        return left + right
      case TIMES:
        return left * right
      case MINUS:
        return left - right
      case DIVIDE:
        return left / right
    }
  } else {
    return ast.value
  }
}

// Event listeners

const queryField = document.querySelector('#query');
const answerField = document.querySelector('#answer');

// Numbers and operators
[...document.querySelectorAll('.number-button, .ops-button')].forEach(btn => {
  btn.addEventListener('click', e => {
    queryField.innerHTML = `${queryField.innerHTML}${e.target.innerHTML}`
  })
})

// Clear button
document.querySelector('#clear').addEventListener('click', e => {
  queryField.innerHTML = ""
  answerField.innerHTML = "0"
})

// Equals button
document.querySelector('#equals').addEventListener('click', e => {
  if (queryField.innerHTML !== '') {
    try {
      const answer = evaluate(parse(tokenize(queryField.innerHTML)))
      answerField.innerHTML = answer === Infinity ? "You're insane." : answer
    } catch(e) {
      alert("Syntax error!")
    }
    
    queryField.innerHTML = ""
  }
})