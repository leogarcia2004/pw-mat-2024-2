import React from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3'
import { ptBR } from 'date-fns/locale/pt-BR'
import { parseISO } from 'date-fns'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import InputMask from 'react-input-mask'
import { feedbackWait, feedbackNotify, feedbackConfirm } from '../../ui/Feedback'
import { useNavigate, useParams } from 'react-router-dom'

export default function CustomersForm() {

  const brazilianStates = [
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PR', label: 'Paraná' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'SP', label: 'São Paulo' }
  ]

  const phoneMaskFormatChars = {
    '9': '[0-9]',    // somente dígitos
    '%': '[\s0-9]'   // dígitos ou espaço em branco (\s)
  }

  const formDefaults = {
    name: '',
    ident_document: '',
    birth_date: null,
    street_name: '',
    house_number: '',
    complements: '',
    district: '',
    municipality: '',
    state: '',
    phone: '',
    email: ''
  }

  const navigate = useNavigate()
  const params = useParams()

  const [state, setState] = React.useState({
    customer: { ...formDefaults },
    formModified: false
  })
  const {
    customer,
    formModified
  } = state

  // Se estivermos editando um cliente, precisamos carregar
  // seus dados assim que o componente for carregado
  React.useEffect(() => {
    // Sabemos que estamos editando (e não cadastrando um novo)
    // cliente quando a rota ativa contiver um parâmetro id
    if (params.id) loadData()
  }, [])

  async function loadData() {
    feedbackWait(true)
    try {
      const response = await fetch(
        import.meta.env.VITE_API_BASE + '/customers/' + params.id 
      )
      const result = await response.json()
      
      // Converte o formato da data armazenado no banco de dados
      // para o formato reconhecido pelo componente DatePicker
      if(result.birth_date) result.birth_date = parseISO(result.birth_date)

      setState({ ...params, customer: result })
    }
    catch(error) {
      console.log(error)
      feedbackNotify('ERRO: ' + error.message, 'error')
    }
    finally {
      feedbackWait(false)
    }
  }

  /*
    Preenche o campo do objeto customer conforme
    o campo correspondente do formulário for
    modificado
  */
  function handleFieldChange(event) {
    // Vamos observar no console as informações que chegam
    // à função handleFieldChange
    console.log({ name: event.target.name, value: event.target.value })

    // Tira uma cópia da variável de estado customer
    const customerCopy = { ...customer }
    // Altera em customerCopy apenas o campo da vez
    customerCopy[event.target.name] = event.target.value
    // Atualiza a variável de estado, substituindo o objeto
    // customer por sua cópia atualizada
    setState({ ...state, customer: customerCopy, formModified: true })
  }

  async function handleFormSubmit(event) {
    event.preventDefault()      // Impede o recarregamento da página

    feedbackWait(true)
    try {
      // Prepara as opções para o fetch
      const reqOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      }

      // Infoca o fetch para enviar os dados ao back-end.
      // Se houver parâmetro na rota, significa que estamos alterando
      // um registro existente e, portanto, o verbo precisa ser PUT
      if(params.id) {
        reqOptions.method = 'PUT'
        await fetch(
          import.meta.env.VITE_API_BASE + '/customers/' + params.id,
          reqOptions
        )
      }
      // Senão, envia com o método POST para criar um novo registro
      else {
        await fetch(
          import.meta.env.VITE_API_BASE + '/customers',
          reqOptions
        )
      }

      feedbackNotify('Item salvo com sucesso.', 'success', 4000, () => {
        // Retorna para a página de listagem
        navigate('..', { relative: 'path', replace: true })
      })

    }
    catch(error) {
      console.log(error)
      feedbackNotify('ERRO: ' + error.message, 'error')
    }
    finally {
      feedbackWait(false)
    }
  }

  async function handleBackButtonClick() {
    if(
      formModified && 
      ! await feedbackConfirm('Há informações não salvas. Deseja realmente voltar?')
    ) return // Sai da função sem fazer nada

    // Aqui o usuário respondeu que quer voltar e perder os dados
    navigate('..', { relative: 'path', 'replace': true })
  }

  return (
    <>
      { /* gutterBottom coloca um espaçamento extra abaixo do componente */ }
      <Typography variant="h1" gutterBottom>
        { params.id ? `Editar cliente #${params.id}` : 'Cadastrar novo cliente' }
      </Typography>

      <Box className="form-fields">
        <form onSubmit={handleFormSubmit}>

          {/* autoFocus = foco do teclado no primeiro campo */}
          <TextField
            variant="outlined" 
            name="name"
            label="Nome completo"
            fullWidth
            required
            autoFocus
            value={customer.name}
            onChange={handleFieldChange}
          />

          <InputMask
            mask="999.999.999-99"
            value={customer.ident_document}
            onChange={handleFieldChange}
          >
            { () => 
                <TextField
                  variant="outlined" 
                  name="ident_document"
                  label="CPF" 
                  fullWidth
                  required
                />
            }
          </InputMask>

          {/*
            O evento onChange do componente DatePicker não passa
            o parâmetro event, como no TextField, e sim a própria
            data que foi modificada. Por isso, ao chamar a função
            handleFieldChange no DatePicker, precisamos criar um
            parâmetro event "fake" com as informações necessárias
          */}
          <LocalizationProvider 
            dateAdapter={AdapterDateFns}
            adapterLocale={ptBR}
          >
            <DatePicker
              label="Data de nascimento"
              value={customer.birth_date}
              slotProps={{
                textField: {
                  variant: 'outlined',
                  fullWidth: true
                }
              }}
              onChange={ date => {
                const event = { target: { name: 'birth_date', value: date } }
                handleFieldChange(event)
              }}
            />
          </LocalizationProvider>

          <TextField
            variant="outlined" 
            name="street_name"
            label="Logradouro (Rua, Av., etc.)" 
            fullWidth
            required
            value={customer.street_name}
            onChange={handleFieldChange}
          />

          <TextField
            variant="outlined" 
            name="house_number"
            label="nº" 
            fullWidth
            required
            value={customer.house_number}
            onChange={handleFieldChange}
          />

          <TextField
            variant="outlined" 
            name="complements"
            label="Complemento" 
            fullWidth
            /* required */
            value={customer.complements}
            onChange={handleFieldChange}
          />

          <TextField
            variant="outlined" 
            name="district"
            label="Bairro" 
            fullWidth
            required
            value={customer.district}
            onChange={handleFieldChange}
          />

          <TextField
            variant="outlined" 
            name="municipality"
            label="Município" 
            fullWidth
            required
            value={customer.municipality}
            onChange={handleFieldChange}
          />

          <TextField
            variant="outlined" 
            name="state"
            label="UF" 
            fullWidth
            required
            value={customer.state}
            select
            onChange={handleFieldChange}
          >
            {
              brazilianStates.map(s => 
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              )
            }
          </TextField>

          <InputMask
            formatChars={phoneMaskFormatChars}
            mask="(99) %9999-9999"
            value={customer.phone}
            maskChar=" "
            onChange={handleFieldChange}
          >
            { () => 
              <TextField
                variant="outlined" 
                name="phone"
                label="Telefone/Celular" 
                fullWidth
                required
              />
            }
          </InputMask>

          <TextField
            variant="outlined" 
            name="email"
            label="E-mail" 
            fullWidth
            required
            value={customer.email}
            onChange={handleFieldChange}
          />

          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-around',
            width: '100%'
          }}>
            <Button
              variant="contained"
              color="secondary"
              type="submit"
            >
              Salvar
            </Button>

            <Button
              variant="outlined"
              onClick={handleBackButtonClick}
            >
              Voltar
            </Button>
          </Box>

          <Box sx={{
            fontFamily: 'monospace',
            display: 'flex',
            flexDirection: 'column',
            width: '100vw'
          }}>
            {JSON.stringify(customer, null, ' ')}
          </Box>

        </form>
      </Box>
      
    </>
  )
}